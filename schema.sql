CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT,
  phone TEXT,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS member_line_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  provider_key TEXT NOT NULL CHECK (provider_key IN ('oa1', 'oa2')),
  shop_id INTEGER NOT NULL,
  line_user_id TEXT NOT NULL,
  bound_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider_key, line_user_id),
  UNIQUE(member_id, provider_key),
  FOREIGN KEY(member_id) REFERENCES members(id)
);

CREATE TABLE IF NOT EXISTS point_operations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  provider_key TEXT NOT NULL CHECK (provider_key IN ('oa1', 'oa2')),
  shop_id INTEGER NOT NULL,
  line_user_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('checkin', 'grant', 'redeem')),
  point_type TEXT NOT NULL,
  point_delta REAL NOT NULL,
  external_insert_id INTEGER,
  business_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(member_id) REFERENCES members(id)
);
