export type FreshnessState = "current" | "stale" | "historical" | "unavailable";

interface FreshnessInput {
  status: string;
  verified: string;
  freshnessDays?: number | null;
}

interface FreshnessResult {
  state: FreshnessState;
  label: string;
  detail: string;
  ageDays: number;
}

const proofSnapshot = new Date("2026-07-29T12:00:00-04:00");

export function deriveFreshness({
  status,
  verified,
  freshnessDays = null
}: FreshnessInput): FreshnessResult {
  const verifiedDate = new Date(`${verified}T12:00:00-04:00`);
  if (Number.isNaN(verifiedDate.getTime())) {
    throw new Error(`Invalid verification date: ${verified}`);
  }

  const ageDays = Math.max(
    0,
    Math.floor((proofSnapshot.getTime() - verifiedDate.getTime()) / 86_400_000)
  );

  if (status.toLowerCase() === "historical") {
    return {
      state: "historical",
      label: "Historical",
      detail: "Historical record",
      ageDays
    };
  }

  if (freshnessDays === null) {
    return {
      state: "unavailable",
      label: "Freshness not set",
      detail: `Verified ${verified}; no freshness threshold is defined`,
      ageDays
    };
  }

  if (ageDays > freshnessDays) {
    const overdueDays = ageDays - freshnessDays;
    return {
      state: "stale",
      label: "Stale",
      detail: `Stale by ${overdueDays} day${overdueDays === 1 ? "" : "s"}`,
      ageDays
    };
  }

  return {
    state: "current",
    label: "Current",
    detail: ageDays === 0 ? "Verified today" : `Verified ${ageDays} day${ageDays === 1 ? "" : "s"} ago`,
    ageDays
  };
}
