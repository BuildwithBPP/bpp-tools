const root = document.querySelector("[data-refresh-api]");
const api = root?.dataset.refreshApi;

if (root && api) {
  const apiUrl = (path) => new URL(path, api === "." ? window.location.origin : api).toString();
  const setBadge = (source, state, label) => {
    const badge = root.querySelector(`[data-refresh-status="${source}"] .status-badge`);
    if (!badge) return;
    badge.className = `status-badge status-${state}`;
    const mark = badge.querySelector(".status-mark");
    badge.textContent = "";
    if (mark) badge.append(mark);
    badge.append(document.createTextNode(label));
  };
  const formatDate = (value) => value
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "No successful snapshot yet.";

  const loadStatus = async () => {
    try {
      const response = await fetch(apiUrl("/api/refresh/status"), { credentials: "include" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Connector status is unavailable.");
      for (const source of payload.sources ?? []) {
        const button = root.querySelector(`[data-refresh-button="${source.id}"]`);
        const evidence = root.querySelector(`[data-refresh-evidence="${source.id}"]`);
        if (button) {
          button.disabled = !source.configured;
          button.textContent = source.configured ? "Refresh now" : "Connector setup required";
        }
        if (!source.configured) {
          setBadge(source.id, "unavailable", "Setup required");
          if (evidence) {
            evidence.textContent = source.configuration_reason
              ?? "Credentials or account access are not configured.";
          }
        } else if (source.latest?.last_error) {
          setBadge(source.id, "at-risk", "Needs attention");
          if (evidence) evidence.textContent = `Last error: ${source.latest.last_error}`;
        } else if (source.latest?.last_success_at) {
          setBadge(source.id, "current", "Connected");
          if (evidence) evidence.textContent = `Last successful refresh: ${formatDate(source.latest.last_success_at)}`;
        } else {
          setBadge(source.id, "needs-review", "Ready to test");
          if (evidence) evidence.textContent = "Configured, with no successful snapshot yet.";
        }
      }
    } catch (error) {
      for (const button of root.querySelectorAll("[data-refresh-button]")) button.disabled = true;
      for (const evidence of root.querySelectorAll("[data-refresh-evidence]")) {
        evidence.textContent = error instanceof Error ? error.message : "Connector status is unavailable.";
      }
    }
  };

  root.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-refresh-trigger]");
    if (!button) return;
    const source = button.dataset.refreshTrigger;
    const result = root.querySelector(`[data-refresh-result="${source}"]`);
    button.disabled = true;
    if (result) result.textContent = "Refresh started...";
    try {
      const response = await fetch(apiUrl(`/api/refresh/${source}`), { method: "POST", credentials: "include" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? payload.reason ?? "Refresh failed.");
      const historyResponse = await fetch(apiUrl(`/api/data/${source}/history?limit=1`), { credentials: "include" });
      const history = historyResponse.ok ? await historyResponse.json() : null;
      const historyVerified = Boolean(history?.snapshots?.length);
      if (result) {
        result.textContent = `Refresh complete. ${payload.snapshot?.record_count ?? 0} records preserved.${historyVerified ? " Historical snapshot verified." : ""}`;
      }
      window.dispatchEvent(new CustomEvent("bpp:source-refreshed", { detail: { source } }));
      await loadStatus();
    } catch (error) {
      if (result) result.textContent = error instanceof Error ? error.message : "Refresh failed.";
    } finally {
      button.disabled = false;
    }
  });

  loadStatus();
}
