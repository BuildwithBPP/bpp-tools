function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function authorizeManualRefresh(email, allowedEmails) {
  const actor = normalizeEmail(email);
  if (!actor) throw new Error("Manual refresh requires an authenticated owner.");
  const allowlist = new Set(allowedEmails.map(normalizeEmail));
  if (!allowlist.has(actor)) throw new Error("This identity is not approved to refresh BPP HQ data.");
  return actor;
}

export function sourcesForCron(cron, records) {
  if (cron === "15 10 * * *") return records.filter((record) => record.schedule === "daily");
  if (cron === "30 10 * * MON") {
    return records.filter((record) => record.schedule === "weekly" || record.schedule === "weekly-after-monday-brief");
  }
  return [];
}

function validateEnvelope(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Refresh payload must be a JSON object.");
  }
  if (!Number.isInteger(payload.schema_version) || payload.schema_version < 1) {
    throw new Error("Refresh payload has an invalid schema_version.");
  }
  if (!payload.captured_at || Number.isNaN(Date.parse(payload.captured_at))) {
    throw new Error("Refresh payload has an invalid captured_at timestamp.");
  }
  if (!Array.isArray(payload.records)) {
    throw new Error("Refresh payload records must be an array.");
  }
  return payload;
}

function rawKey(source, now, id) {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `raw/${source}/${year}/${month}/${day}/${id}.json`;
}

export async function runRefresh({ source, trigger, actor, now, idFactory, adapter, store }) {
  if (!adapter?.configured) {
    return {
      source,
      status: "disabled",
      reason: adapter?.reason ?? "Connector is not configured."
    };
  }

  const id = idFactory();
  const startedAt = now.toISOString();
  await store.startJob({ id, source, trigger, actor, started_at: startedAt });

  try {
    const payload = validateEnvelope(await adapter.pull({ source, trigger, actor, now }));
    const r2Key = rawKey(source, now, id);
    await store.putRaw(r2Key, JSON.stringify(payload));

    const snapshot = {
      id,
      source,
      schema_version: payload.schema_version,
      captured_at: payload.captured_at,
      stored_at: startedAt,
      record_count: payload.records.length,
      r2_key: r2Key,
      trigger,
      actor
    };
    await store.commitSnapshot(snapshot);
    await store.finishJob(id, { snapshot_id: snapshot.id, record_count: snapshot.record_count });
    return { source, status: "completed", snapshot };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown refresh failure";
    await store.failJob(id, message);
    throw error;
  }
}
