import type { Round } from "../types/domain";

export type VoterStatus = "eligible" | "too-late" | "not-registered";

/** Mirrors submit_ballot's two checks against the account's first interaction. */
export function voterStatus(round: Round, firstSeen: number | null): VoterStatus {
  if (firstSeen === null) return "not-registered";
  const { opensAt, tMin } = round.config;
  return firstSeen < opensAt && firstSeen + tMin <= opensAt ? "eligible" : "too-late";
}
