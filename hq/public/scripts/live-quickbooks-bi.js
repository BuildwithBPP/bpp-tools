const quickBooksCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});
const quickBooksCompactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1
});
const quickBooksDateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

function setQuickBooksText(root, selector, value) {
  const element = root.querySelector(selector);
  if (element) element.textContent = value;
}

function quickBooksMetricPresentation(metric, payload) {
  const field = metric.dataset.liveQuickbooksMetric;
  const value = payload.metrics[field];
  if (!Number.isFinite(value)) return null;

  if (field === "revenue_ytd") {
    const target = Number(metric.dataset.livePlanTarget);
    return {
      value: quickBooksCompactCurrency.format(value),
      comparison: Number.isFinite(target) && target > 0
        ? `${((value / target) * 100).toFixed(1)}% of ${quickBooksCompactCurrency.format(target)} base plan`
        : "Cash-basis year-to-date revenue"
    };
  }
  if (field === "net_income_ytd") {
    const revenue = payload.metrics.revenue_ytd;
    return {
      value: quickBooksCompactCurrency.format(value),
      comparison: Number.isFinite(revenue) && revenue !== 0
        ? `${((value / revenue) * 100).toFixed(1)}% net margin`
        : "Cash-basis year-to-date net income"
    };
  }

  const bufferTarget = Number(metric.dataset.liveBufferTarget);
  return {
    value: quickBooksCompactCurrency.format(value),
    comparison: Number.isFinite(bufferTarget)
      ? `${quickBooksCurrency.format(Math.abs(bufferTarget - value))} operating buffer gap`
      : `Accounts receivable: ${Number.isFinite(payload.metrics.accounts_receivable) ? quickBooksCurrency.format(payload.metrics.accounts_receivable) : "unavailable"}`
  };
}

function renderQuickBooksMetrics(payload) {
  const timeframe = `${payload.report_basis ?? "Cash"} basis through ${payload.period_end ?? quickBooksDateTime.format(new Date(payload.captured_at))}`;
  for (const metric of document.querySelectorAll("[data-live-quickbooks-metric]")) {
    const presentation = quickBooksMetricPresentation(metric, payload);
    if (!presentation) continue;
    setQuickBooksText(metric, "[data-live-value]", presentation.value);
    setQuickBooksText(metric, "[data-live-comparison]", presentation.comparison);
    setQuickBooksText(metric, "[data-live-timeframe]", timeframe);
    setQuickBooksText(metric, "[data-live-source]", "QuickBooks preserved snapshot");
  }
}

async function loadQuickBooksBi() {
  try {
    const response = await fetch("/api/bi/quickbooks", { credentials: "include" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "QuickBooks summary is unavailable.");
    renderQuickBooksMetrics(payload);
  } catch {
    // Dated static values remain visible until the first governed QuickBooks snapshot succeeds.
  }
}

window.addEventListener("bpp:source-refreshed", (event) => {
  if (event.detail?.source === "quickbooks") loadQuickBooksBi();
});

loadQuickBooksBi();
