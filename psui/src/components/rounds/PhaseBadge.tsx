import type { RoundPhase } from "../../types/domain";

export function PhaseBadge({ phase }: { phase: RoundPhase }) {
  return <span className={`phase-badge phase-badge--${phase.toLowerCase()}`}>{phase}</span>;
}
