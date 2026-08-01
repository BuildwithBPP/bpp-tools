function amount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stageDefinitions(records) {
  return new Map(
    records
      .filter((record) => record?.kind === "pipeline")
      .flatMap((pipeline) => (pipeline.stages ?? []).map((stage) => [
        stage.id,
        {
          id: stage.id,
          label: stage.label ?? stage.id,
          pipeline: pipeline.label ?? pipeline.id,
          probability: amount(stage.metadata?.probability),
          closed: String(stage.metadata?.isClosed) === "true"
        }
      ]))
  );
}

function closeDateValue(value) {
  const timestamp = Date.parse(value ?? "");
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

export function summarizeHubSpotSnapshot(snapshot) {
  if (!snapshot || snapshot.source !== "hubspot") {
    throw new Error("A valid HubSpot snapshot is required.");
  }
  if (!Array.isArray(snapshot.records)) {
    throw new Error("HubSpot snapshot records must be an array.");
  }

  const stages = stageDefinitions(snapshot.records);
  const deals = snapshot.records.filter((record) => record?.kind === "deal");
  const capturedYear = String(snapshot.captured_at ?? "").slice(0, 4);
  const openDeals = [];
  const openStageTotals = new Map();
  let weightedPipelineAmount = 0;
  let closedWonYtdAmount = 0;
  let closedWonYtdCount = 0;
  let hotDealCount = 0;

  for (const deal of deals) {
    const properties = deal.properties ?? {};
    const stage = stages.get(properties.dealstage) ?? {
      id: properties.dealstage ?? "unknown",
      label: properties.dealstage ?? "Unknown stage",
      pipeline: properties.pipeline ?? "Unknown pipeline",
      probability: 0,
      closed: false
    };
    const dealAmount = amount(properties.amount);

    if (!stage.closed) {
      weightedPipelineAmount += dealAmount * stage.probability;
      if (stage.probability >= 0.6) hotDealCount += 1;
      const stageTotal = openStageTotals.get(stage.id) ?? {
        id: stage.id,
        label: stage.label,
        count: 0,
        amount: 0,
        probability: stage.probability
      };
      stageTotal.count += 1;
      stageTotal.amount += dealAmount;
      openStageTotals.set(stage.id, stageTotal);
      openDeals.push({
        id: deal.id,
        name: properties.dealname || "Unnamed deal",
        amount: dealAmount,
        stage: stage.label,
        probability: stage.probability,
        close_date: properties.closedate ?? null,
        owner_id: properties.hubspot_owner_id ?? null
      });
    }

    if (
      String(properties.hs_is_closed_won) === "true" &&
      String(properties.closedate ?? "").slice(0, 4) === capturedYear
    ) {
      closedWonYtdAmount += amount(properties.hs_closed_amount) || dealAmount;
      closedWonYtdCount += 1;
    }
  }

  openDeals.sort((left, right) => closeDateValue(left.close_date) - closeDateValue(right.close_date));

  return {
    schema_version: 1,
    source: "hubspot",
    captured_at: snapshot.captured_at,
    record_count: snapshot.records.length,
    metrics: {
      open_pipeline_amount: openDeals.reduce((total, deal) => total + deal.amount, 0),
      weighted_pipeline_amount: weightedPipelineAmount,
      open_deal_count: openDeals.length,
      hot_deal_count: hotDealCount,
      closed_won_ytd_amount: closedWonYtdAmount,
      closed_won_ytd_count: closedWonYtdCount
    },
    open_deals: openDeals,
    open_stages: [...openStageTotals.values()].sort((left, right) => right.probability - left.probability)
  };
}
