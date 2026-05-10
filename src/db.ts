import type { Env, MemberLineAccount, PointListItem, ProviderKey, SyncedPointAccount } from "./types";
import { HttpError } from "./http";

export async function createMember(
  env: Env,
  body: { displayName?: string; phone?: string; email?: string }
): Promise<number> {
  const result = await env.DB.prepare(
    "INSERT INTO members (display_name, phone, email) VALUES (?, ?, ?) RETURNING id"
  )
    .bind(body.displayName ?? null, body.phone ?? null, body.email ?? null)
    .first<{ id: number }>();

  if (!result) throw new HttpError(500, "Failed to create member");
  return result.id;
}

export async function bindLineAccount(
  env: Env,
  options: {
    memberId: number;
    providerKey: ProviderKey;
    shopId: number;
    lineUserId: string;
  }
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO member_line_accounts (member_id, provider_key, shop_id, line_user_id)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(member_id, provider_key)
     DO UPDATE SET shop_id = excluded.shop_id, line_user_id = excluded.line_user_id, bound_at = CURRENT_TIMESTAMP`
  )
    .bind(options.memberId, options.providerKey, options.shopId, options.lineUserId)
    .run();

  await env.DB.prepare(
    `UPDATE synced_point_accounts
     SET member_id = ?
     WHERE provider_key = ? AND line_user_id = ?`
  )
    .bind(options.memberId, options.providerKey, options.lineUserId)
    .run();
}

export async function getMemberAccounts(env: Env, memberId: number): Promise<MemberLineAccount[]> {
  const result = await env.DB.prepare(
    `SELECT member_id, provider_key, shop_id, line_user_id
     FROM member_line_accounts
     WHERE member_id = ?`
  )
    .bind(memberId)
    .all<MemberLineAccount>();

  return result.results ?? [];
}

export async function getMemberAccount(
  env: Env,
  memberId: number,
  providerKey: ProviderKey
): Promise<MemberLineAccount> {
  const account = await env.DB.prepare(
    `SELECT member_id, provider_key, shop_id, line_user_id
     FROM member_line_accounts
     WHERE member_id = ? AND provider_key = ?`
  )
    .bind(memberId, providerKey)
    .first<MemberLineAccount>();

  if (!account) {
    throw new HttpError(404, `Member has not linked ${providerKey}`);
  }

  return account;
}

export async function hasOperation(env: Env, businessKey: string): Promise<boolean> {
  const row = await env.DB.prepare("SELECT id FROM point_operations WHERE business_key = ?")
    .bind(businessKey)
    .first<{ id: number }>();

  return Boolean(row);
}

export async function recordOperation(
  env: Env,
  options: {
    memberId: number;
    providerKey: ProviderKey;
    shopId: number;
    lineUserId: string;
    action: "checkin" | "grant" | "redeem";
    pointType: string;
    pointDelta: number;
    externalInsertId?: number;
    businessKey: string;
  }
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO point_operations (
       member_id, provider_key, shop_id, line_user_id, action, point_type,
       point_delta, external_insert_id, business_key
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      options.memberId,
      options.providerKey,
      options.shopId,
      options.lineUserId,
      options.action,
      options.pointType,
      options.pointDelta,
      options.externalInsertId ?? null,
      options.businessKey
    )
    .run();
}

export async function saveSyncedPointItems(
  env: Env,
  providerKey: ProviderKey,
  items: PointListItem[]
): Promise<{ entries: number; accounts: number }> {
  const accountMap = new Map<string, { item: PointListItem; balances: Record<string, number> }>();
  const statements: D1PreparedStatement[] = [];

  for (const item of items) {
    statements.push(
      env.DB.prepare(
        `INSERT OR REPLACE INTO synced_point_entries (
          provider_key, point_id, wp_user_id, line_user_id, shop_id, event_name,
          event_content, point_type, get_point, point_balance, created_at, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        providerKey,
        String(item.id),
        item.user_id ?? null,
        item.LINE_user_id,
        Number(item.shop_id),
        item.event_name ?? null,
        item.event_content ?? null,
        item.point_type,
        Number(item.get_point || 0),
        item.point_balance === undefined ? null : Number(item.point_balance),
        item.created_at,
        JSON.stringify(item)
      )
    );

    const existing = accountMap.get(item.LINE_user_id);
    if (!existing || item.created_at > existing.item.created_at) {
      accountMap.set(item.LINE_user_id, { item, balances: existing?.balances ?? {} });
    } else if (!existing.balances[item.point_type]) {
      existing.balances[item.point_type] = Number(item.point_balance ?? item.get_point ?? 0);
    }

    const account = accountMap.get(item.LINE_user_id);
    if (account && item.point_balance !== undefined) {
      account.balances[item.point_type] = Number(item.point_balance);
    }
  }

  for (const [lineUserId, account] of accountMap) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO synced_point_accounts (
          provider_key, shop_id, line_user_id, wp_user_id, balances_json, last_point_at, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(provider_key, line_user_id)
        DO UPDATE SET
          shop_id = excluded.shop_id,
          wp_user_id = excluded.wp_user_id,
          balances_json = excluded.balances_json,
          last_point_at = excluded.last_point_at,
          synced_at = CURRENT_TIMESTAMP`
      ).bind(
        providerKey,
        Number(account.item.shop_id),
        lineUserId,
        account.item.user_id ?? null,
        JSON.stringify(account.balances),
        account.item.created_at
      )
    );
  }

  if (statements.length) await env.DB.batch(statements);
  return { entries: items.length, accounts: accountMap.size };
}

export async function searchSyncedAccounts(
  env: Env,
  options: { providerKey?: ProviderKey; query?: string; limit?: number }
): Promise<SyncedPointAccount[]> {
  const like = `%${options.query ?? ""}%`;
  const limit = Math.min(options.limit ?? 50, 200);

  if (options.providerKey) {
    const result = await env.DB.prepare(
      `SELECT provider_key, shop_id, line_user_id, wp_user_id, balances_json, last_point_at, synced_at, member_id
       FROM synced_point_accounts
       WHERE provider_key = ?
         AND (? = '%%' OR line_user_id LIKE ? OR wp_user_id LIKE ?)
       ORDER BY synced_at DESC, last_point_at DESC
       LIMIT ?`
    )
      .bind(options.providerKey, like, like, like, limit)
      .all<SyncedPointAccount>();

    return result.results ?? [];
  }

  const result = await env.DB.prepare(
    `SELECT provider_key, shop_id, line_user_id, wp_user_id, balances_json, last_point_at, synced_at, member_id
     FROM synced_point_accounts
     WHERE ? = '%%' OR line_user_id LIKE ? OR wp_user_id LIKE ?
     ORDER BY synced_at DESC, last_point_at DESC
     LIMIT ?`
  )
    .bind(like, like, like, limit)
    .all<SyncedPointAccount>();

  return result.results ?? [];
}

export async function mergeSyncedAccounts(
  env: Env,
  options: {
    displayName?: string;
    oa1LineUserId?: string;
    oa2LineUserId?: string;
  }
): Promise<number> {
  if (!options.oa1LineUserId && !options.oa2LineUserId) {
    throw new HttpError(400, "At least one LINE_user_id is required");
  }

  const existingRows = await Promise.all([
    options.oa1LineUserId
      ? env.DB.prepare("SELECT member_id FROM synced_point_accounts WHERE provider_key = 'oa1' AND line_user_id = ?")
          .bind(options.oa1LineUserId)
          .first<{ member_id: number | null }>()
      : null,
    options.oa2LineUserId
      ? env.DB.prepare("SELECT member_id FROM synced_point_accounts WHERE provider_key = 'oa2' AND line_user_id = ?")
          .bind(options.oa2LineUserId)
          .first<{ member_id: number | null }>()
      : null
  ]);

  const memberId =
    existingRows.find((row) => row?.member_id)?.member_id ??
    (await createMember(env, { displayName: options.displayName ?? "Merged member" }));

  if (options.oa1LineUserId) {
    const row = await env.DB.prepare(
      "SELECT shop_id FROM synced_point_accounts WHERE provider_key = 'oa1' AND line_user_id = ?"
    )
      .bind(options.oa1LineUserId)
      .first<{ shop_id: number }>();
    if (row) await bindLineAccount(env, { memberId, providerKey: "oa1", shopId: row.shop_id, lineUserId: options.oa1LineUserId });
  }

  if (options.oa2LineUserId) {
    const row = await env.DB.prepare(
      "SELECT shop_id FROM synced_point_accounts WHERE provider_key = 'oa2' AND line_user_id = ?"
    )
      .bind(options.oa2LineUserId)
      .first<{ shop_id: number }>();
    if (row) await bindLineAccount(env, { memberId, providerKey: "oa2", shopId: row.shop_id, lineUserId: options.oa2LineUserId });
  }

  return memberId;
}
