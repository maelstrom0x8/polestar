/** Plain-language rendering of the contract's refusal codes. */
const COPY: Record<string, string> = {
  ERR_WRONG_PHASE: "This round has moved on since you loaded this page.",
  ERR_NO_DEPOSIT: "A small deposit is required to register a project.",
  ERR_ZERO_COST: "Cost must be greater than zero.",
  ERR_TITLE_TOO_LONG: "The title is longer than the contract allows.",
  ERR_SUMMARY_TOO_LONG: "The summary is longer than the contract allows.",
  ERR_TOO_MANY_PROJECTS: "This round has reached its project limit.",
  ERR_MILESTONE_SUM_MISMATCH: "Milestone amounts must add up to exactly the project's cost.",
  ERR_NO_PROJECTS: "At least one project must be registered before declaration can open.",
  ERR_NO_PRIOR_INTERACTION: "This account wasn't registered as a voter early enough to support projects in this round.",
  ERR_ACCOUNT_TOO_NEW: "This account wasn't registered as a voter early enough to support projects in this round.",
  ERR_ALREADY_VOTED: "This account has already declared its support in this round.",
  ERR_EMPTY_APPROVAL: "Choose at least one project to support.",
  ERR_UNREGISTERED_PROJECT: "One of the selected projects isn't registered in this round.",
  ERR_DECLARATION_CLOSED: "Declaration has closed for this round.",
  ERR_DECLARATION_NOT_YET_CLOSED: "Declaration can't be closed yet; its closing block hasn't passed.",
  ERR_ROUND_NOT_FOUND: "This round doesn't exist.",
  ERR_ARITHMETIC_OVERFLOW: "The amounts are too large for the contract to add up.",
};

/** Codes that point at an anomaly rather than a designed refusal. */
const ANOMALIES = new Set(["ERR_RATIONAL_OVERFLOW", "ERR_ALLOCATION_INVARIANT_VIOLATED"]);

export function describeRefusal(code: string): { text: string; anomaly: boolean } {
  if (ANOMALIES.has(code)) {
    return { text: "The contract hit an unexpected condition and stopped. Nothing was changed.", anomaly: true };
  }
  return { text: COPY[code] ?? "The contract refused this request. Nothing was changed.", anomaly: false };
}
