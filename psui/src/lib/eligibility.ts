import type { Round } from "../types/domain";

export type VoterStatus = "eligible" | "too-late" | "not-registered" | "not-member";

export function isDirectSubAccount(account: string, parent: string): boolean {
  const suffix = `.${parent}`;
  if (!account.endsWith(suffix)) return false;
  const label = account.slice(0, -suffix.length);
  return label.length > 0 && !label.includes(".");
}

/** Mirrors submit_ballot's checks against the account's first interaction. */
export function voterStatus(round: Round, accountId: string, firstSeen: number | null): VoterStatus {
  if (round.voterNamespace && !isDirectSubAccount(accountId, round.voterNamespace)) return "not-member";
  if (firstSeen === null) return "not-registered";
  const { opensAt, tMin } = round.config;
  return firstSeen < opensAt && firstSeen + tMin <= opensAt ? "eligible" : "too-late";
}
