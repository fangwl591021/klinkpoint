# KlinkPoint Users API WordPress Plugin

This small WordPress plugin exposes a protected endpoint:

```text
GET /wp-json/klinkpoint/v1/users
```

It returns WordPress users and their LINE UID when the UID is stored in user meta.

## Install

1. Upload `wordpress-plugin/klinkpoint-users` to:

```text
wp-content/plugins/klinkpoint-users
```

2. In WordPress admin, enable **KlinkPoint Users API**.
3. Open:

```text
Settings -> KlinkPoint Users
```

4. Copy the API Key.

## Test

```bash
curl "https://k-link.cc/wp-json/klinkpoint/v1/users?per_page=10" \
  -H "x-klinkpoint-api-key: YOUR_PLUGIN_API_KEY"
```

Optional role filter:

```bash
curl "https://k-link.cc/wp-json/klinkpoint/v1/users?role=wetw_ai_vip&per_page=100" \
  -H "x-klinkpoint-api-key: YOUR_PLUGIN_API_KEY"
```

## Response

```json
{
  "success": true,
  "page": 1,
  "per_page": 100,
  "total": 123,
  "total_pages": 2,
  "users": [
    {
      "wp_user_id": 534,
      "user_login": "U012e2380deb2d5815f6b6bda6bef35a6",
      "display_name": "Member",
      "email": "member@example.com",
      "line_user_id": "U012e2380deb2d5815f6b6bda6bef35a6",
      "line_meta_key": "line_user_id"
    }
  ]
}
```
