import type { RoundPhase } from "../types/domain";

/** What people see; the contract's own phase names stay internal. */
export const PHASE_LABEL: Record<RoundPhase, string> = {
  Registration: "Open for proposals",
  Declaration: "Voting",
  Allocation: "Counting",
  Settlement: "Results",
};
