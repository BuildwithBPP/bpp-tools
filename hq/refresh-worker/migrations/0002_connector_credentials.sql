CREATE TABLE IF NOT EXISTS connector_credentials (
  source TEXT NOT NULL,
  name TEXT NOT NULL,
  version INTEGER NOT NULL,
  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (source, name)
);
