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

function utcDay(value: Date | string) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error("Invalid freshness comparison date.");
    }
    return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Invalid verification date: ${value}`);
  }

  const [, year, month, day] = match;
  const timestamp = Date.UTC(Number(year), Number(month) - 1, Number(day));
  const parsed = new Date(timestamp);
  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() !== Number(month) - 1 ||
    parsed.getUTCDate() !== Number(day)
  ) {
    throw new Error(`Invalid verification date: ${value}`);
  }
  return timestamp;
}

export function deriveFreshness({
  status,
  verified,
  freshnessDays = null
}: FreshnessInput, asOf: Date | string = new Date()): FreshnessResult {
  const verifiedDay = utcDay(verified);
  const comparisonDay = utcDay(asOf);

  const ageDays = Math.max(
    0,
    Math.floor((comparisonDay - verifiedDay) / 86_400_000)
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
