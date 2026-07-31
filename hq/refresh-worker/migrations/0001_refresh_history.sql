CREATE TABLE IF NOT EXISTS refresh_jobs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'schedule')),
  actor TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  result_json TEXT,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_refresh_jobs_source_started
ON refresh_jobs (source, started_at DESC);

CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  captured_at TEXT NOT NULL,
  stored_at TEXT NOT NULL,
  record_count INTEGER NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  trigger_type TEXT NOT NULL,
  actor TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_snapshots_source_captured
ON snapshots (source, captured_at DESC);

CREATE TABLE IF NOT EXISTS source_status (
  source TEXT PRIMARY KEY,
  latest_snapshot_id TEXT,
  last_success_at TEXT,
  last_error TEXT,
  last_error_at TEXT,
  FOREIGN KEY (latest_snapshot_id) REFERENCES snapshots(id)
);
