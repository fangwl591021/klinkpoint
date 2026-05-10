export type ProviderKey = "oa1" | "oa2";

export interface Env {
  DB: D1Database;
  POINT_API_BASE_URL: string;
  POINT_API_KEY: string;
  OA1_SHOP_ID: string;
  OA2_SHOP_ID: string;
  ADMIN_TOKEN?: string;
}

export interface PointListItem {
  id: string;
  user_id: string;
  LINE_user_id: string;
  shop_id: string;
  event_name: string;
  event_content: string;
  point_type: string;
  get_point: string;
  point_balance?: string;
  created_at: string;
  shop_user_lineid?: string;
  child_shop_name?: string;
  child_shop_renew?: string;
  shop_remark?: string;
}

export interface QueryPointListResponse {
  success: boolean;
  code: string;
  message: string;
  data?: {
    pagination: {
      page: number;
      per_page: number;
      total: number;
      total_pages: number;
    };
    list: PointListItem[];
  };
}

export interface InsertPointResponse {
  success: boolean;
  code: string;
  message: string;
  data?: {
    insert_id: number;
    user_id: number;
    LINE_user_id: string;
    shop_id: number;
    event_name: string;
    event_content: string;
    point_type: string;
    get_point: number;
  };
}

export interface MemberLineAccount {
  member_id: number;
  provider_key: ProviderKey;
  shop_id: number;
  line_user_id: string;
}
