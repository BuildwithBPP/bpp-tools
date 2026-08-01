const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});
const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1
});
const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });
const dateOnly = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

function setText(root, selector, value) {
  const element = root.querySelector(selector);
  if (element) element.textContent = value;
}

function metricPresentation(field, payload) {
  if (field === "open_pipeline_amount") {
    return {
      value: compactCurrency.format(payload.metrics.open_pipeline_amount),
      comparison: `${payload.metrics.open_deal_count} open opportunities, ${compactCurrency.format(payload.metrics.weighted_pipeline_amount)} weighted`
    };
  }
  return {
    value: String(payload.metrics.hot_deal_count),
    comparison: "At 60% or higher stage probability"
  };
}

function renderPageMetrics(payload) {
  const timeframe = `Captured ${dateTime.format(new Date(payload.captured_at))}`;
  for (const metric of document.querySelectorAll("[data-live-hubspot-metric]")) {
    const presentation = metricPresentation(metric.dataset.liveHubspotMetric, payload);
    setText(metric, "[data-live-value]", presentation.value);
    setText(metric, "[data-live-comparison]", presentation.comparison);
    setText(metric, "[data-live-timeframe]", timeframe);
    setText(metric, "[data-live-source]", "HubSpot preserved snapshot");
  }
}

function appendCell(row, value, sensitive = false) {
  const cell = document.createElement("td");
  cell.textContent = value;
  if (sensitive) cell.dataset.sensitive = "true";
  row.append(cell);
}

function renderPreview(payload) {
  const preview = document.querySelector("[data-hubspot-bi-preview]");
  if (!preview) return;
  setText(preview, "[data-hubspot-bi-status]", `Latest snapshot: ${dateTime.format(new Date(payload.captured_at))}. ${payload.record_count} records preserved.`);
  setText(preview, '[data-hubspot-bi-value="open_pipeline_amount"]', currency.format(payload.metrics.open_pipeline_amount));
  setText(preview, '[data-hubspot-bi-value="weighted_pipeline_amount"]', currency.format(payload.metrics.weighted_pipeline_amount));
  setText(preview, '[data-hubspot-bi-value="open_deal_count"]', String(payload.metrics.open_deal_count));
  setText(preview, '[data-hubspot-bi-value="closed_won_ytd_amount"]', `${currency.format(payload.metrics.closed_won_ytd_amount)} (${payload.metrics.closed_won_ytd_count})`);

  const body = preview.querySelector("[data-hubspot-bi-deals]");
  if (!body) return;
  body.textContent = "";
  if (!payload.open_deals.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = "No open HubSpot deals in the latest snapshot.";
    row.append(cell);
    body.append(row);
    return;
  }
  for (const deal of payload.open_deals) {
    const row = document.createElement("tr");
    appendCell(row, deal.name, true);
    appendCell(row, deal.stage);
    appendCell(row, currency.format(deal.amount), true);
    appendCell(row, `${Math.round(deal.probability * 100)}%`);
    appendCell(row, deal.close_date ? dateOnly.format(new Date(deal.close_date)) : "Not set");
    body.append(row);
  }
}

function renderStageTable(payload) {
  const body = document.querySelector("[data-hubspot-stage-table]");
  if (!body) return;
  body.textContent = "";
  for (const stage of payload.open_stages ?? []) {
    const row = document.createElement("tr");
    appendCell(row, stage.label);
    appendCell(row, String(stage.count));
    appendCell(row, currency.format(stage.amount), true);
    appendCell(row, `${Math.round(stage.probability * 100)}%`);
    body.append(row);
  }
  const evidence = document.querySelector("[data-hubspot-stage-evidence]");
  if (evidence) {
    setText(evidence, "[data-hubspot-stage-message]", `Showing ${payload.metrics.open_deal_count} open opportunities from the snapshot captured ${dateTime.format(new Date(payload.captured_at))}.`);
    const badge = evidence.querySelector(".status-badge");
    if (badge) {
      badge.className = "status-badge status-current";
      badge.textContent = "Current snapshot";
    }
  }
}

async function loadHubSpotBi() {
  try {
    const response = await fetch("/api/bi/hubspot", { credentials: "include" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "HubSpot summary is unavailable.");
    renderPageMetrics(payload);
    renderPreview(payload);
    renderStageTable(payload);
  } catch (error) {
    const preview = document.querySelector("[data-hubspot-bi-preview]");
    if (preview) {
      setText(preview, "[data-hubspot-bi-status]", error instanceof Error ? error.message : "HubSpot summary is unavailable.");
    }
  }
}

window.addEventListener("bpp:source-refreshed", (event) => {
  if (event.detail?.source === "hubspot") loadHubSpotBi();
});

loadHubSpotBi();
