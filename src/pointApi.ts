import type { Env, InsertPointResponse, PointListItem, ProviderKey, QueryPointListResponse } from "./types";
import { HttpError } from "./http";

export function getShopId(env: Env, providerKey: ProviderKey): number {
  return Number(providerKey === "oa1" ? env.OA1_SHOP_ID : env.OA2_SHOP_ID);
}

async function postPointApi<T>(env: Env, path: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${env.POINT_API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      api_key: env.POINT_API_KEY,
      ...payload
    })
  });

  const result = (await response.json()) as T & { success?: boolean; message?: string; code?: string };
  if (!response.ok || result.success === false) {
    throw new HttpError(response.status || 502, result.message || "Point API request failed", result);
  }

  return result;
}

export async function queryPointList(
  env: Env,
  options: {
    lineUserId: string;
    shopId: number;
    pointType?: string;
    dateStart?: string;
    dateEnd?: string;
    page?: number;
    perPage?: number;
  }
): Promise<PointListItem[]> {
  const result = await postPointApi<QueryPointListResponse>(env, "/query-user-point-list", {
    LINE_user_id: options.lineUserId,
    shop_id: options.shopId,
    point_type: options.pointType,
    date_start: options.dateStart,
    date_end: options.dateEnd,
    page: options.page ?? 1,
    per_page: Math.min(options.perPage ?? 100, 100)
  });

  return result.data?.list ?? [];
}

export async function insertPoint(
  env: Env,
  options: {
    lineUserId: string;
    shopId: number;
    eventName: string;
    eventContent: string;
    pointType: string;
    pointDelta: number;
    shopRemark?: string;
  }
): Promise<InsertPointResponse> {
  return postPointApi<InsertPointResponse>(env, "/insert-user-point", {
    LINE_user_id: options.lineUserId,
    shop_id: options.shopId,
    event_name: options.eventName,
    event_content: options.eventContent,
    point_type: options.pointType,
    get_point: options.pointDelta,
    shop_user_lineid: "",
    child_shop_name: "",
    child_shop_renew: 0,
    shop_remark: options.shopRemark ?? ""
  });
}
