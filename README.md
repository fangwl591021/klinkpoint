# LINE Point Hub

不同 LINE Provider 的雙 LINEOA 點數整併後端。

這個專案使用 Cloudflare Worker + D1，負責：

- 綁定同一個網站會員在兩個 LINEOA 的不同 `LINE_user_id`
- 查詢兩家點數資料並整併到同一個頁面可用的 JSON
- 每日簽到贈點
- 管理員贈點
- 點數核銷扣點

## 架構

```text
網站前端
  |
  v
Cloudflare Worker
  |
  +-- D1: members / member_line_accounts / point_operations
  |
  +-- wetw-point API: query-user-point-list / insert-user-point
```

## 環境變數

`wrangler.toml` 已放非機密設定：

```toml
POINT_API_BASE_URL = "https://aiwe.cc/index.php/wp-json/wetw-point/v1"
OA1_SHOP_ID = "1086"
OA2_SHOP_ID = "1584"
```

機密值請用 Wrangler secret：

```bash
npx wrangler secret put POINT_API_KEY
npx wrangler secret put ADMIN_TOKEN
```

`ADMIN_TOKEN` 可選，但正式上線建議設定，會保護 `/api/points/grant`。

## D1 初始化

```bash
npx wrangler d1 create line-point-hub
```

把產生的 `database_id` 填回 `wrangler.toml`，再執行：

```bash
npx wrangler d1 execute line-point-hub --file=./schema.sql
```

## API

### 建立網站會員

```http
POST /api/members
```

```json
{
  "display_name": "王小明",
  "phone": "0912345678",
  "email": "user@example.com"
}
```

### 綁定 LINEOA 帳號

```http
POST /api/member/link
```

```json
{
  "member_id": 1,
  "provider_key": "oa1",
  "LINE_user_id": "Uxxxxxxxx"
}
```

`provider_key` 可用：

- `oa1`
- `oa2`

若不傳 `shop_id`，會自動套用 `OA1_SHOP_ID` 或 `OA2_SHOP_ID`。

### 查詢整併點數

```http
GET /api/points/summary?member_id=1
```

可選參數：

- `point_type`
- `date_start`
- `date_end`

### 每日簽到

```http
POST /api/points/checkin
```

```json
{
  "member_id": 1,
  "provider_key": "oa1",
  "point_type": "system_point",
  "points": 10
}
```

同一天、同會員、同 Provider 只能簽到一次。

### 管理員贈點

```http
POST /api/points/grant
Authorization: Bearer YOUR_ADMIN_TOKEN
```

```json
{
  "member_id": 1,
  "provider_key": "oa1",
  "point_type": "system_point",
  "points": 100,
  "event_name": "活動贈點",
  "event_content": "滿額活動"
}
```

### 核銷扣點

```http
POST /api/points/redeem
```

```json
{
  "member_id": 1,
  "provider_key": "oa1",
  "point_type": "system_point",
  "points": 50,
  "business_key": "order:20260510-001"
}
```

核銷前會先查詢目前餘額，不足會拒絕。

## 開發

```bash
npm install
npm run check
npm run dev
```

## 注意

- 不同 Provider 的 `LINE_user_id` 不會相同，所以一定要先完成雙帳號綁定。
- 前端不要直接呼叫 wetw-point API，避免 API Key 外洩。
- 正式上線前請更換已外露的 API Key。
- 若 `point_balance` 不一定可靠，建議請原外掛補一支「查目前餘額」API，核銷會更安全。

## WordPress 會員 UID API

`wordpress-plugin/klinkpoint-users` 提供一個 WordPress 外掛，用來從 `wp_usermeta` 匯出會員的 LINE UID：

```text
GET /wp-json/klinkpoint/v1/users
```

安裝後到 WordPress：

```text
Settings -> KlinkPoint Users
```

複製 API Key，再用：

```bash
curl "https://k-link.cc/wp-json/klinkpoint/v1/users?role=wetw_ai_vip&per_page=100" \
  -H "x-klinkpoint-api-key: YOUR_PLUGIN_API_KEY"
```

If you only have WordPress admin login access and cannot install plugins, use:

```text
docs/wp-admin-console-export.md
```

That flow runs a browser console script inside `wp-admin` and imports detected LINE UIDs into KlinkPoint.
