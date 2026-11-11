export type PolestarEventType =
  | "RoundFunded"
  | "ProjectRegistered"
  | "DeclarationOpened"
  | "BallotSubmitted"
  | "DeclarationClosed"
  | "ProjectFunded"
  | "ProjectUnfunded"
  | "AllocationFinalized"
  | "MilestoneAttested"
  | "MilestoneReleaseFailed"
  | "RemainingReturned"
  | "RemainingReturnFailed";

export interface PolestarEvent {
  type: PolestarEventType;
  data: Record<string, string>;
}

const TYPES = new Set<string>([
  "RoundFunded",
  "ProjectRegistered",
  "DeclarationOpened",
  "BallotSubmitted",
  "DeclarationClosed",
  "ProjectFunded",
  "ProjectUnfunded",
  "AllocationFinalized",
  "MilestoneAttested",
  "MilestoneReleaseFailed",
  "RemainingReturned",
  "RemainingReturnFailed",
]);

export function parseEvent(line: string): PolestarEvent | null {
  const [type, ...pairs] = line.trim().split(/\s+/);
  if (!type || !TYPES.has(type)) return null;
  const data: Record<string, string> = {};
  for (const pair of pairs) {
    const eq = pair.indexOf("=");
    if (eq <= 0) return null;
    data[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
  return { type: type as PolestarEventType, data };
}

export function parseEvents(logs: string[]): PolestarEvent[] {
  return logs.flatMap((line) => {
    const event = parseEvent(line);
    return event ? [event] : [];
  });
}
