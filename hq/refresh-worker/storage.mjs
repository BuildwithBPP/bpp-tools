import { decryptCredential, encryptCredential } from "./credential-crypto.mjs";

export class D1R2Store {
  constructor(env) {
    if (!env.HQ_DB || !env.HQ_RAW) throw new Error("HQ_DB and HQ_RAW bindings are required.");
    this.db = env.HQ_DB;
    this.raw = env.HQ_RAW;
    this.credentialEncryptionKey = env.CREDENTIAL_ENCRYPTION_KEY;
  }

  async writeCredential(source, name, plaintext) {
    if (!this.credentialEncryptionKey) throw new Error("CREDENTIAL_ENCRYPTION_KEY is required for connector credential storage.");
    const encrypted = await encryptCredential(plaintext, this.credentialEncryptionKey);
    await this.db.prepare(
      `INSERT INTO connector_credentials (source, name, version, ciphertext, iv, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(source, name) DO UPDATE SET
         version = excluded.version,
         ciphertext = excluded.ciphertext,
         iv = excluded.iv,
         updated_at = excluded.updated_at`
    ).bind(source, name, encrypted.version, encrypted.ciphertext, encrypted.iv).run();
  }

  async readCredential(source, name) {
    if (!this.credentialEncryptionKey) return null;
    const row = await this.db.prepare(
      "SELECT version, ciphertext, iv FROM connector_credentials WHERE source = ? AND name = ?"
    ).bind(source, name).first();
    return row ? decryptCredential(row, this.credentialEncryptionKey) : null;
  }

  async startJob(job) {
    await this.db.prepare(
      `INSERT INTO refresh_jobs (id, source, trigger_type, actor, status, started_at)
       VALUES (?, ?, ?, ?, 'running', ?)`
    ).bind(job.id, job.source, job.trigger, job.actor, job.started_at).run();
  }

  async putRaw(key, payload) {
    await this.raw.put(key, payload, { httpMetadata: { contentType: "application/json" } });
  }

  async commitSnapshot(snapshot) {
    await this.db.batch([
      this.db.prepare(
        `INSERT INTO snapshots
         (id, source, schema_version, captured_at, stored_at, record_count, r2_key, trigger_type, actor)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        snapshot.id,
        snapshot.source,
        snapshot.schema_version,
        snapshot.captured_at,
        snapshot.stored_at,
        snapshot.record_count,
        snapshot.r2_key,
        snapshot.trigger,
        snapshot.actor
      ),
      this.db.prepare(
        `INSERT INTO source_status (source, latest_snapshot_id, last_success_at)
         VALUES (?, ?, ?)
         ON CONFLICT(source) DO UPDATE SET
           latest_snapshot_id = excluded.latest_snapshot_id,
           last_success_at = excluded.last_success_at,
           last_error = NULL,
           last_error_at = NULL`
      ).bind(snapshot.source, snapshot.id, snapshot.stored_at)
    ]);
  }

  async finishJob(id, result) {
    await this.db.prepare(
      `UPDATE refresh_jobs SET status = 'completed', completed_at = datetime('now'), result_json = ? WHERE id = ?`
    ).bind(JSON.stringify(result), id).run();
  }

  async failJob(id, message) {
    const job = await this.db.prepare("SELECT source FROM refresh_jobs WHERE id = ?").bind(id).first();
    await this.db.batch([
      this.db.prepare(
        `UPDATE refresh_jobs SET status = 'failed', completed_at = datetime('now'), error_message = ? WHERE id = ?`
      ).bind(message, id),
      this.db.prepare(
        `INSERT INTO source_status (source, last_error, last_error_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(source) DO UPDATE SET last_error = excluded.last_error, last_error_at = excluded.last_error_at`
      ).bind(job.source, message)
    ]);
  }

  async recentlyStarted(source, seconds = 300) {
    const row = await this.db.prepare(
      `SELECT id FROM refresh_jobs
       WHERE source = ? AND status = 'running' AND unixepoch(started_at) >= unixepoch('now', ?)
       LIMIT 1`
    ).bind(source, `-${seconds} seconds`).first();
    return Boolean(row);
  }

  async listStatus() {
    const result = await this.db.prepare(
      `SELECT source, latest_snapshot_id, last_success_at, last_error, last_error_at FROM source_status`
    ).all();
    return result.results ?? [];
  }

  async latest(source) {
    const metadata = await this.db.prepare(
      `SELECT s.* FROM snapshots s
       JOIN source_status ss ON ss.latest_snapshot_id = s.id
       WHERE ss.source = ?`
    ).bind(source).first();
    if (!metadata) return null;
    const object = await this.raw.get(metadata.r2_key);
    if (!object) throw new Error(`Raw payload ${metadata.r2_key} is missing.`);
    return { metadata, data: await object.json() };
  }

  async history(source, limit) {
    const result = await this.db.prepare(
      `SELECT id, source, schema_version, captured_at, stored_at, record_count, trigger_type, actor
       FROM snapshots WHERE source = ? ORDER BY captured_at DESC LIMIT ?`
    ).bind(source, limit).all();
    return result.results ?? [];
  }
}
