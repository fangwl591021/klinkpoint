import { getMemberAccount, getMemberAccounts, bindLineAccount, createMember, hasOperation, recordOperation } from "./db";
import { handleError, HttpError, json, readJson, requireAdmin, requireFields } from "./http";
import { getShopId, insertPoint, queryPointList } from "./pointApi";
import { html, renderApp } from "./ui";
import type { Env, PointListItem, ProviderKey } from "./types";

type RouteHandler = (request: Request, env: Env) => Promise<Response>;

const providerKeys = new Set(["oa1", "oa2"]);

function parseProviderKey(value: unknown): ProviderKey {
  if (typeof value === "string" && providerKeys.has(value)) return value as ProviderKey;
  throw new HttpError(400, "provider_key must be oa1 or oa2");
}

function numberFrom(value: unknown, field: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new HttpError(400, `${field} must be a number`);
  return parsed;
}

function summarize(items: PointListItem[]): Record<string, number> {
  const balances: Record<string, number> = {};
  const latestByType = new Map<string, PointListItem>();

  for (const item of items) {
    const current = latestByType.get(item.point_type);
    if (!current || item.created_at > current.created_at) {
      latestByType.set(item.point_type, item);
    }
  }

  for (const [pointType, item] of latestByType) {
    const balance = Number(item.point_balance);
    balances[pointType] = Number.isFinite(balance)
      ? balance
      : items
          .filter((entry) => entry.point_type === pointType)
          .reduce((sum, entry) => sum + Number(entry.get_point || 0), 0);
  }

  return balances;
}

function todayTaipei(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

async function healthRoute(_request: Request, env: Env): Promise<Response> {
  return json({
    success: true,
    service: "klinkpoint",
    worker: "ready",
    point_api_base_url: env.POINT_API_BASE_URL,
    providers: {
      oa1_shop_id: env.OA1_SHOP_ID,
      oa2_shop_id: env.OA2_SHOP_ID
    }
  });
}

async function appRoute(): Promise<Response> {
  return html(renderApp());
}

async function createMemberRoute(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{ display_name?: string; phone?: string; email?: string }>(request);
  const memberId = await createMember(env, {
    displayName: body.display_name,
    phone: body.phone,
    email: body.email
  });

  return json({ success: true, member_id: memberId });
}

async function linkAccountRoute(request: Request, env: Env): Promise<Response> {
  const body = await readJson<Record<string, unknown>>(request);
  requireFields(body, ["member_id", "provider_key", "LINE_user_id"]);

  const providerKey = parseProviderKey(body.provider_key);
  const memberId = numberFrom(body.member_id, "member_id");
  const shopId = body.shop_id ? numberFrom(body.shop_id, "shop_id") : getShopId(env, providerKey);

  await bindLineAccount(env, {
    memberId,
    providerKey,
    shopId,
    lineUserId: String(body.LINE_user_id)
  });

  return json({ success: true });
}

async function pointsSummaryRoute(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const memberId = numberFrom(url.searchParams.get("member_id"), "member_id");
  const pointType = url.searchParams.get("point_type") ?? undefined;
  const dateStart = url.searchParams.get("date_start") ?? undefined;
  const dateEnd = url.searchParams.get("date_end") ?? undefined;

  const accounts = await getMemberAccounts(env, memberId);
  const perProvider = await Promise.all(
    accounts.map(async (account) => {
      const list = await queryPointList(env, {
        lineUserId: account.line_user_id,
        shopId: account.shop_id,
        pointType,
        dateStart,
        dateEnd
      });

      return {
        provider_key: account.provider_key,
        shop_id: account.shop_id,
        LINE_user_id: account.line_user_id,
        balances: summarize(list),
        list
      };
    })
  );

  const total: Record<string, number> = {};
  for (const provider of perProvider) {
    for (const [pointTypeKey, balance] of Object.entries(provider.balances)) {
      total[pointTypeKey] = (total[pointTypeKey] ?? 0) + balance;
    }
  }

  return json({
    success: true,
    member_id: memberId,
    total,
    providers: perProvider
  });
}

async function checkinRoute(request: Request, env: Env): Promise<Response> {
  const body = await readJson<Record<string, unknown>>(request);
  requireFields(body, ["member_id", "provider_key"]);

  const memberId = numberFrom(body.member_id, "member_id");
  const providerKey = parseProviderKey(body.provider_key);
  const pointType = String(body.point_type ?? "system_point");
  const points = numberFrom(body.points ?? 10, "points");
  const account = await getMemberAccount(env, memberId, providerKey);
  const businessKey = `checkin:${providerKey}:${account.line_user_id}:${todayTaipei()}`;

  if (await hasOperation(env, businessKey)) {
    throw new HttpError(409, "Already checked in today");
  }

  const result = await insertPoint(env, {
    lineUserId: account.line_user_id,
    shopId: account.shop_id,
    eventName: String(body.event_name ?? "Daily checkin"),
    eventContent: String(body.event_content ?? "Daily checkin reward"),
    pointType,
    pointDelta: Math.abs(points),
    shopRemark: businessKey
  });

  await recordOperation(env, {
    memberId,
    providerKey,
    shopId: account.shop_id,
    lineUserId: account.line_user_id,
    action: "checkin",
    pointType,
    pointDelta: Math.abs(points),
    externalInsertId: result.data?.insert_id,
    businessKey
  });

  return json({ success: true, result });
}

async function grantRoute(request: Request, env: Env): Promise<Response> {
  requireAdmin(request, env.ADMIN_TOKEN);
  const body = await readJson<Record<string, unknown>>(request);
  requireFields(body, ["member_id", "provider_key", "point_type", "points"]);

  const memberId = numberFrom(body.member_id, "member_id");
  const providerKey = parseProviderKey(body.provider_key);
  const points = Math.abs(numberFrom(body.points, "points"));
  const pointType = String(body.point_type);
  const account = await getMemberAccount(env, memberId, providerKey);
  const businessKey = String(body.business_key ?? `grant:${crypto.randomUUID()}`);

  const result = await insertPoint(env, {
    lineUserId: account.line_user_id,
    shopId: account.shop_id,
    eventName: String(body.event_name ?? "Admin point grant"),
    eventContent: String(body.event_content ?? "Manual admin point grant"),
    pointType,
    pointDelta: points,
    shopRemark: businessKey
  });

  await recordOperation(env, {
    memberId,
    providerKey,
    shopId: account.shop_id,
    lineUserId: account.line_user_id,
    action: "grant",
    pointType,
    pointDelta: points,
    externalInsertId: result.data?.insert_id,
    businessKey
  });

  return json({ success: true, result });
}

async function redeemRoute(request: Request, env: Env): Promise<Response> {
  const body = await readJson<Record<string, unknown>>(request);
  requireFields(body, ["member_id", "provider_key", "point_type", "points"]);

  const memberId = numberFrom(body.member_id, "member_id");
  const providerKey = parseProviderKey(body.provider_key);
  const points = Math.abs(numberFrom(body.points, "points"));
  const pointType = String(body.point_type);
  const account = await getMemberAccount(env, memberId, providerKey);
  const businessKey = String(body.business_key ?? `redeem:${crypto.randomUUID()}`);

  if (await hasOperation(env, businessKey)) {
    throw new HttpError(409, "Duplicate redeem request");
  }

  const list = await queryPointList(env, {
    lineUserId: account.line_user_id,
    shopId: account.shop_id,
    pointType
  });
  const balance = summarize(list)[pointType] ?? 0;
  if (balance < points) {
    throw new HttpError(409, "Insufficient point balance", { balance, required: points });
  }

  const result = await insertPoint(env, {
    lineUserId: account.line_user_id,
    shopId: account.shop_id,
    eventName: String(body.event_name ?? "Point redeem"),
    eventContent: String(body.event_content ?? "Member point redeem"),
    pointType,
    pointDelta: -points,
    shopRemark: businessKey
  });

  await recordOperation(env, {
    memberId,
    providerKey,
    shopId: account.shop_id,
    lineUserId: account.line_user_id,
    action: "redeem",
    pointType,
    pointDelta: -points,
    externalInsertId: result.data?.insert_id,
    businessKey
  });

  return json({ success: true, balance_before: balance, result });
}

const routes: Record<string, RouteHandler> = {
  "GET /": appRoute,
  "GET /health": healthRoute,
  "POST /api/members": createMemberRoute,
  "POST /api/member/link": linkAccountRoute,
  "GET /api/points/summary": pointsSummaryRoute,
  "POST /api/points/checkin": checkinRoute,
  "POST /api/points/grant": grantRoute,
  "POST /api/points/redeem": redeemRoute
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return json({ success: true });

    try {
      const url = new URL(request.url);
      const route = routes[`${request.method} ${url.pathname}`];
      if (!route) throw new HttpError(404, "Not found");
      return await route(request, env);
    } catch (error) {
      return handleError(error);
    }
  }
};
