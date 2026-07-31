const root = document.querySelector("[data-refresh-api]");
const api = root?.dataset.refreshApi;

if (root && api) {
  root.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-refresh-trigger]");
    if (!button) return;
    const source = button.dataset.refreshTrigger;
    const result = root.querySelector(`[data-refresh-result="${source}"]`);
    button.disabled = true;
    if (result) result.textContent = "Refresh started...";
    try {
      const response = await fetch(`${api}/api/refresh/${source}`, { method: "POST", credentials: "include" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? payload.reason ?? "Refresh failed.");
      if (result) result.textContent = "Refresh accepted. Status and freshness will update when the snapshot completes.";
    } catch (error) {
      if (result) result.textContent = error instanceof Error ? error.message : "Refresh failed.";
    } finally {
      button.disabled = false;
    }
  });
}
