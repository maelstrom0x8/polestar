/**
 * What this browser has submitted, per account. There's no on-chain index
 * of "projects this account proposed", so this is browser-local by design
 * and the account page says so.
 */
export type ActivityEntry =
  | { kind: "project"; roundId: string; projectId: string; title: string; at: number }
  | { kind: "ballot"; roundId: string; count: number; at: number };

const key = (accountId: string) => `psui:activity:${accountId}`;

export function readActivity(accountId: string): ActivityEntry[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key(accountId)) ?? "[]");
    return Array.isArray(parsed) ? (parsed as ActivityEntry[]) : [];
  } catch {
    return [];
  }
}

export function recordActivity(accountId: string, entry: ActivityEntry) {
  try {
    localStorage.setItem(key(accountId), JSON.stringify([entry, ...readActivity(accountId)].slice(0, 200)));
  } catch {
    // Storage unavailable: the account page will simply show less history.
  }
}
