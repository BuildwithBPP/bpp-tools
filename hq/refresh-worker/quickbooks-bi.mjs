function normalized(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function accountingAmount(value) {
  const input = String(value ?? "").trim();
  if (!input) return null;
  const negative = /^\(.*\)$/.test(input);
  const parsed = Number(input.replace(/[,$()\s]/g, ""));
  if (!Number.isFinite(parsed)) return null;
  return negative ? -parsed : parsed;
}

function collectLines(node, lines = []) {
  if (!node || typeof node !== "object") return lines;
  for (const key of ["ColData", "Header", "Summary"]) {
    const value = node[key];
    const cells = key === "ColData" ? value : value?.ColData;
    if (Array.isArray(cells) && cells.length >= 2) {
      const label = normalized(cells[0]?.value);
      const amount = accountingAmount(cells.at(-1)?.value);
      if (label && amount !== null) lines.push({ label, amount });
    }
  }
  for (const child of node.Rows?.Row ?? []) collectLines(child, lines);
  return lines;
}

function report(snapshot, id) {
  return snapshot.records.find((record) => record?.kind === "report" && record.id === id) ?? null;
}

function reportMeasure(record, labels) {
  if (!record) return null;
  const lines = collectLines(record.data);
  for (const label of labels) {
    const match = lines.find((line) => line.label === normalized(label));
    if (match) return match.amount;
  }
  return null;
}

export function summarizeQuickBooksSnapshot(snapshot) {
  if (!snapshot || snapshot.source !== "quickbooks") {
    throw new Error("A valid QuickBooks snapshot is required.");
  }
  if (!Array.isArray(snapshot.records)) {
    throw new Error("QuickBooks snapshot records must be an array.");
  }

  const profitAndLoss = report(snapshot, "profit-and-loss");
  const balanceSheet = report(snapshot, "balance-sheet");
  const header = profitAndLoss?.data?.Header ?? {};

  return {
    schema_version: 1,
    source: "quickbooks",
    captured_at: snapshot.captured_at,
    record_count: snapshot.records.length,
    report_basis: header.ReportBasis ?? profitAndLoss?.parameters?.accounting_method ?? null,
    period_start: header.StartPeriod ?? profitAndLoss?.parameters?.start_date ?? null,
    period_end: header.EndPeriod ?? profitAndLoss?.parameters?.end_date ?? null,
    metrics: {
      revenue_ytd: reportMeasure(profitAndLoss, ["Total Income", "Total Revenue"]),
      gross_profit_ytd: reportMeasure(profitAndLoss, ["Gross Profit", "Total Gross Profit"]),
      expenses_ytd: reportMeasure(profitAndLoss, ["Total Expenses"]),
      net_income_ytd: reportMeasure(profitAndLoss, ["Net Income", "Total Net Income"]),
      cash_available: reportMeasure(balanceSheet, [
        "Total Bank Accounts",
        "Total Cash and Cash Equivalents",
        "Cash and Cash Equivalents"
      ]),
      accounts_receivable: reportMeasure(balanceSheet, [
        "Total Accounts Receivable",
        "Total Accounts Receivable (A/R)",
        "Accounts Receivable (A/R)"
      ])
    }
  };
}
