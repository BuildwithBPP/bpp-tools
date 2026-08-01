const mondayDateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

function setMondayText(root, selector, value) {
  const element = root.querySelector(selector);
  if (element) element.textContent = value;
}

function mondayMetricPresentation(field, payload) {
  if (field === "tracked_client_count") {
    return {
      value: String(payload.metrics.tracked_client_count),
      comparison: `${payload.metrics.at_risk_client_count} client${payload.metrics.at_risk_client_count === 1 ? "" : "s"} with past-due work`
    };
  }
  if (field === "open_deliverable_count") {
    return {
      value: String(payload.metrics.open_deliverable_count),
      comparison: `${payload.metrics.open_task_count} open subitem task${payload.metrics.open_task_count === 1 ? "" : "s"}`
    };
  }
  return {
    value: String(payload.metrics.overdue_work_count),
    comparison: "Open parent items and subitems due before today"
  };
}

function renderMondayMetrics(payload) {
  const timeframe = `Captured ${mondayDateTime.format(new Date(payload.captured_at))}`;
  for (const metric of document.querySelectorAll("[data-live-monday-metric]")) {
    const presentation = mondayMetricPresentation(metric.dataset.liveMondayMetric, payload);
    setMondayText(metric, "[data-live-value]", presentation.value);
    setMondayText(metric, "[data-live-comparison]", presentation.comparison);
    setMondayText(metric, "[data-live-timeframe]", timeframe);
    setMondayText(metric, "[data-live-source]", "Monday.com preserved snapshot");
  }
}

function appendMondayCell(row, value, sensitive = false) {
  const cell = document.createElement("td");
  cell.textContent = value;
  if (sensitive) cell.dataset.sensitive = "true";
  row.append(cell);
}

function renderMondayClients(payload) {
  const body = document.querySelector("[data-monday-client-table]");
  if (!body) return;
  body.textContent = "";
  for (const client of payload.clients) {
    const row = document.createElement("tr");
    appendMondayCell(row, client.client, true);
    appendMondayCell(row, String(client.open_deliverables));
    appendMondayCell(row, String(client.open_tasks));
    appendMondayCell(row, String(client.overdue_work));
    appendMondayCell(row, client.last_updated ? mondayDateTime.format(new Date(client.last_updated)) : "Not available");
    const health = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `status-badge status-${client.health === "at-risk" ? "at-risk" : "current"}`;
    badge.textContent = client.health === "at-risk" ? "At risk" : "Current";
    health.append(badge);
    row.append(health);
    body.append(row);
  }
}

async function loadMondayBi() {
  const status = document.querySelector("[data-monday-bi-status]");
  try {
    const response = await fetch("/api/bi/monday", { credentials: "include" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Monday.com summary is unavailable.");
    renderMondayMetrics(payload);
    renderMondayClients(payload);
    if (status) {
      status.textContent = `Live Monday.com snapshot captured ${mondayDateTime.format(new Date(payload.captured_at))}. Parent deliverables and subitems are included.`;
    }
  } catch (error) {
    if (status) {
      status.textContent = `${error instanceof Error ? error.message : "Monday.com summary is unavailable."} Showing the dated static fallback.`;
    }
  }
}

window.addEventListener("bpp:source-refreshed", (event) => {
  if (event.detail?.source === "monday") loadMondayBi();
});

loadMondayBi();
