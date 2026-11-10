/** Plain-language rendering of the contract's refusal codes. */
const COPY: Record<string, string> = {
  ERR_WRONG_PHASE: "This round has moved to a new stage since you opened this page.",
  ERR_NO_DEPOSIT: "A deposit is required to propose a project.",
  ERR_ZERO_COST: "Cost must be greater than zero.",
  ERR_TITLE_TOO_LONG: "The title is too long.",
  ERR_SUMMARY_TOO_LONG: "The summary is too long.",
  ERR_TOO_MANY_PROJECTS: "This round isn't taking more proposals; it's full.",
  ERR_MILESTONE_SUM_MISMATCH: "The milestones must add up to the total cost.",
  ERR_NO_PROJECTS: "Voting can only start once there's at least one proposal.",
  ERR_NO_PRIOR_INTERACTION: "This account didn't register as a voter in time to vote in this round.",
  ERR_ACCOUNT_TOO_NEW: "This account didn't register as a voter in time to vote in this round.",
  ERR_ALREADY_VOTED: "You've already voted in this round.",
  ERR_EMPTY_APPROVAL: "Pick at least one project.",
  ERR_UNREGISTERED_PROJECT: "One of the selected projects isn't part of this round.",
  ERR_DECLARATION_CLOSED: "Voting has closed for this round.",
  ERR_DECLARATION_NOT_YET_CLOSED: "Voting can't be ended before it closes.",
  ERR_ROUND_NOT_FOUND: "This round doesn't exist.",
  ERR_ARITHMETIC_OVERFLOW: "The amounts are too large.",
};

/** Codes that point at an anomaly rather than a designed refusal. */
const ANOMALIES = new Set(["ERR_RATIONAL_OVERFLOW", "ERR_ALLOCATION_INVARIANT_VIOLATED"]);

export function describeRefusal(code: string): { text: string; anomaly: boolean } {
  if (ANOMALIES.has(code)) {
    return { text: "Something went wrong on our side. Nothing was changed.", anomaly: true };
  }
  return { text: COPY[code] ?? "This couldn't be completed. Nothing was changed.", anomaly: false };
}
