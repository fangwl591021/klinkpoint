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

CREATE TABLE IF NOT EXISTS synced_point_accounts (
  provider_key TEXT NOT NULL CHECK (provider_key IN ('oa1', 'oa2')),
  shop_id INTEGER NOT NULL,
  line_user_id TEXT NOT NULL,
  wp_user_id TEXT,
  balances_json TEXT NOT NULL DEFAULT '{}',
  last_point_at TEXT,
  synced_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  member_id INTEGER,
  PRIMARY KEY(provider_key, line_user_id),
  FOREIGN KEY(member_id) REFERENCES members(id)
);

CREATE TABLE IF NOT EXISTS synced_point_entries (
  provider_key TEXT NOT NULL CHECK (provider_key IN ('oa1', 'oa2')),
  point_id TEXT NOT NULL,
  wp_user_id TEXT,
  line_user_id TEXT NOT NULL,
  shop_id INTEGER NOT NULL,
  event_name TEXT,
  event_content TEXT,
  point_type TEXT NOT NULL,
  get_point REAL NOT NULL,
  point_balance REAL,
  created_at TEXT NOT NULL,
  raw_json TEXT NOT NULL,
  PRIMARY KEY(provider_key, point_id)
);

CREATE INDEX IF NOT EXISTS idx_synced_point_accounts_member_id
  ON synced_point_accounts(member_id);

CREATE INDEX IF NOT EXISTS idx_synced_point_entries_line_user
  ON synced_point_entries(provider_key, line_user_id);

CREATE TABLE IF NOT EXISTS imported_wp_line_users (
  source TEXT NOT NULL,
  wp_user_id INTEGER NOT NULL,
  user_login TEXT,
  display_name TEXT,
  email TEXT,
  line_user_id TEXT NOT NULL,
  raw_json TEXT NOT NULL,
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(source, wp_user_id, line_user_id)
);

CREATE INDEX IF NOT EXISTS idx_imported_wp_line_users_line_user
  ON imported_wp_line_users(line_user_id);
