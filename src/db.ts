import type { Env, MemberLineAccount, ProviderKey } from "./types";
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
