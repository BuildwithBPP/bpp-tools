import assert from "node:assert/strict";
import test from "node:test";

let summarizeHubSpotSnapshot;
try {
  ({ summarizeHubSpotSnapshot } = await import("../refresh-worker/hubspot-bi.mjs"));
} catch {
  // The first TDD run must fail because the production module does not exist yet.
}

const fixture = {
  schema_version: 1,
  source: "hubspot",
  captured_at: "2026-08-01T03:51:01.710Z",
  records: [
    {
      kind: "pipeline",
      id: "pipeline-1",
      label: "Client Acquisition",
      stages: [
        { id: "proposal", label: "Proposal Sent", metadata: { probability: "0.4", isClosed: "false" } },
        { id: "verbal", label: "Verbal Commitment", metadata: { probability: "0.9", isClosed: "false" } },
        { id: "won", label: "Closed Won", metadata: { probability: "1.0", isClosed: "true" } },
        { id: "lost", label: "Deal Lost", metadata: { probability: "0.0", isClosed: "true" } }
      ]
    },
    {
      kind: "deal",
      id: "deal-1",
      properties: {
        dealname: "Proposal deal",
        amount: "1000",
        dealstage: "proposal",
        pipeline: "pipeline-1",
        closedate: "2026-08-15T00:00:00Z",
        hs_is_closed_won: "false"
      }
    },
    {
      kind: "deal",
      id: "deal-2",
      properties: {
        dealname: "Verbal deal",
        amount: "2000",
        dealstage: "verbal",
        pipeline: "pipeline-1",
        closedate: "2026-08-10T00:00:00Z",
        hs_is_closed_won: "false"
      }
    },
    {
      kind: "deal",
      id: "deal-3",
      properties: {
        dealname: "Won deal",
        amount: "1400",
        hs_closed_amount: "1500",
        dealstage: "won",
        pipeline: "pipeline-1",
        closedate: "2026-06-10T00:00:00Z",
        hs_is_closed_won: "true"
      }
    },
    {
      kind: "deal",
      id: "deal-4",
      properties: {
        dealname: "Lost deal",
        amount: "500",
        dealstage: "lost",
        pipeline: "pipeline-1",
        closedate: "2026-05-01T00:00:00Z",
        hs_is_closed_won: "false"
      }
    }
  ]
};

test("summarizes open, weighted, hot, and closed-won HubSpot measures", () => {
  assert.equal(typeof summarizeHubSpotSnapshot, "function", "HubSpot BI summarizer must be implemented.");
  const summary = summarizeHubSpotSnapshot(fixture);

  assert.deepEqual(summary.metrics, {
    open_pipeline_amount: 3000,
    weighted_pipeline_amount: 2200,
    open_deal_count: 2,
    hot_deal_count: 1,
    closed_won_ytd_amount: 1500,
    closed_won_ytd_count: 1
  });
  assert.deepEqual(
    summary.open_deals.map((deal) => [deal.name, deal.amount, deal.stage, deal.probability]),
    [
      ["Verbal deal", 2000, "Verbal Commitment", 0.9],
      ["Proposal deal", 1000, "Proposal Sent", 0.4]
    ]
  );
  assert.deepEqual(summary.open_stages, [
    { id: "verbal", label: "Verbal Commitment", count: 1, amount: 2000, probability: 0.9 },
    { id: "proposal", label: "Proposal Sent", count: 1, amount: 1000, probability: 0.4 }
  ]);
  assert.equal(summary.captured_at, fixture.captured_at);
  assert.equal(summary.record_count, 5);
});

test("rejects snapshots that are not valid HubSpot envelopes", () => {
  assert.equal(typeof summarizeHubSpotSnapshot, "function", "HubSpot BI summarizer must be implemented.");
  assert.throws(
    () => summarizeHubSpotSnapshot({ ...fixture, source: "quickbooks" }),
    /HubSpot snapshot/
  );
  assert.throws(
    () => summarizeHubSpotSnapshot({ ...fixture, records: null }),
    /records/
  );
});
