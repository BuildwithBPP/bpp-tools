import registry from "../src/data/refresh-sources.json" with { type: "json" };

export function sourceRecord(source) {
  return registry.sources.find((record) => record.id === source) ?? null;
}

export function sourceRecords() {
  return registry.sources;
}

export function createAdapter(record, env) {
  const url = env[`${record.env_prefix}_SNAPSHOT_URL`];
  const token = env[`${record.env_prefix}_SNAPSHOT_TOKEN`];
  if (!url) {
    return {
      configured: false,
      reason: `${record.label} connector gateway is not configured.`
    };
  }

  return {
    configured: true,
    async pull() {
      const headers = { Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(25_000) });
      if (!response.ok) throw new Error(`${record.label} refresh returned HTTP ${response.status}.`);
      return response.json();
    }
  };
}
