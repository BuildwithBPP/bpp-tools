import assert from "node:assert/strict";
import test from "node:test";

let summarizeQuickBooksSnapshot;
try {
  ({ summarizeQuickBooksSnapshot } = await import("../refresh-worker/quickbooks-bi.mjs"));
} catch {
  // The first TDD run must fail because the production module does not exist yet.
}

function report(id, rows) {
  return {
    kind: "report",
    id,
    report_name: id,
    parameters: { accounting_method: "Cash" },
    data: {
      Header: { StartPeriod: "2026-01-01", EndPeriod: "2026-08-01", ReportBasis: "Cash" },
      Rows: { Row: rows }
    }
  };
}

const fixture = {
  schema_version: 1,
  source: "quickbooks",
  captured_at: "2026-08-01T12:00:00.000Z",
  records: [
    report("profit-and-loss", [
      { Summary: { ColData: [{ value: "Total Income" }, { value: "15,143.25" }] } },
      { Summary: { ColData: [{ value: "Gross Profit" }, { value: "14,083.22" }] } },
      { Summary: { ColData: [{ value: "Total Expenses" }, { value: "6,938.50" }] } },
      { Summary: { ColData: [{ value: "Net Income" }, { value: "7,144.72" }] } }
    ]),
    report("balance-sheet", [
      {
        Header: { ColData: [{ value: "Bank Accounts" }, { value: "" }] },
        Rows: { Row: [{ ColData: [{ value: "Checking" }, { value: "2,100.00" }] }] },
        Summary: { ColData: [{ value: "Total Bank Accounts" }, { value: "3,291.44" }] }
      },
      { Summary: { ColData: [{ value: "Total Accounts Receivable" }, { value: "2,340.00" }] } }
    ]),
    report("cash-flow", []),
    report("aged-receivables", [])
  ]
};

test("summarizes governed QuickBooks financial measures from report totals", () => {
  assert.equal(typeof summarizeQuickBooksSnapshot, "function", "QuickBooks BI summarizer must be implemented.");
  const summary = summarizeQuickBooksSnapshot(fixture);

  assert.deepEqual(summary.metrics, {
    revenue_ytd: 15143.25,
    gross_profit_ytd: 14083.22,
    expenses_ytd: 6938.5,
    net_income_ytd: 7144.72,
    cash_available: 3291.44,
    accounts_receivable: 2340
  });
  assert.equal(summary.report_basis, "Cash");
  assert.equal(summary.period_start, "2026-01-01");
  assert.equal(summary.period_end, "2026-08-01");
  assert.equal(summary.record_count, 4);
});

test("parses accounting negatives and leaves missing measures unavailable", () => {
  assert.equal(typeof summarizeQuickBooksSnapshot, "function", "QuickBooks BI summarizer must be implemented.");
  const summary = summarizeQuickBooksSnapshot({
    ...fixture,
    records: [report("profit-and-loss", [
      { Summary: { ColData: [{ value: "Total Income" }, { value: "$1,000.00" }] } },
      { Summary: { ColData: [{ value: "Net Income" }, { value: "(250.75)" }] } }
    ])]
  });

  assert.equal(summary.metrics.revenue_ytd, 1000);
  assert.equal(summary.metrics.net_income_ytd, -250.75);
  assert.equal(summary.metrics.cash_available, null);
  assert.equal(summary.metrics.accounts_receivable, null);
});

test("rejects invalid QuickBooks envelopes", () => {
  assert.equal(typeof summarizeQuickBooksSnapshot, "function", "QuickBooks BI summarizer must be implemented.");
  assert.throws(() => summarizeQuickBooksSnapshot({ ...fixture, source: "hubspot" }), /QuickBooks snapshot/);
  assert.throws(() => summarizeQuickBooksSnapshot({ ...fixture, records: null }), /records/);
});
