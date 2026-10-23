CREATE TABLE IF NOT EXISTS items (
  item_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_lower TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('lost', 'found')),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  description_lower TEXT NOT NULL,
  location TEXT NOT NULL,
  location_lower TEXT NOT NULL,
  event_date DATE NOT NULL,
  image_key TEXT,
  contact_name TEXT NOT NULL,
  contact_method TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'under_review', 'returned', 'archived')),
  moderation_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (moderation_status IN ('approved', 'flagged', 'hidden')),
  view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  client_ip_hash TEXT NOT NULL,
  resolved_at TIMESTAMPTZ,
  flagged_at TIMESTAMPTZ,
  moderated_by TEXT
);

CREATE INDEX IF NOT EXISTS items_created_at_idx ON items (created_at DESC, item_id);
CREATE INDEX IF NOT EXISTS items_public_status_idx ON items (status, created_at DESC);
CREATE INDEX IF NOT EXISTS items_type_created_at_idx ON items (type, created_at DESC);
CREATE INDEX IF NOT EXISTS items_category_idx ON items (category);

CREATE TABLE IF NOT EXISTS ownership (
  item_id TEXT PRIMARY KEY REFERENCES items (item_id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  allowed_actions JSONB NOT NULL DEFAULT '["update_status", "edit_details", "delete_report"]',
  failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  last_failed_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS abuse_reports (
  report_id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'offensive', 'inaccurate', 'sensitive_info', 'other')),
  details TEXT NOT NULL DEFAULT '',
  reporter_ip_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'actioned', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT
);

CREATE INDEX IF NOT EXISTS abuse_reports_created_at_idx ON abuse_reports (created_at DESC, report_id);
CREATE INDEX IF NOT EXISTS abuse_reports_status_created_at_idx ON abuse_reports (status, created_at DESC);
