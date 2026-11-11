export type VoterStatus = "eligible" | "too-late" | "not-registered" | "not-member";

export interface EligibilityRound {
  config: { opensAt: number; tMin: number };
  voterNamespace: string | null;
}

export function isDirectSubAccount(account: string, parent: string): boolean {
  const suffix = `.${parent}`;
  if (!account.endsWith(suffix)) return false;
  const label = account.slice(0, -suffix.length);
  return label.length > 0 && !label.includes(".");
}

export function voterStatus(round: EligibilityRound, accountId: string, firstSeen: number | null): VoterStatus {
  if (round.voterNamespace && !isDirectSubAccount(accountId, round.voterNamespace)) return "not-member";
  if (firstSeen === null) return "not-registered";
  const { opensAt, tMin } = round.config;
  return firstSeen < opensAt && firstSeen + tMin <= opensAt ? "eligible" : "too-late";
}
