import type { Round } from "../types/domain";
import { blockDistance, type ChainClock } from "./chainClock";
import { formatNearAmount } from "./format";

/** One plain line saying what's next for a round, from its own config. */
export function roundCue(round: Round, clock: ChainClock | undefined): string {
  switch (round.phase) {
    case "Registration":
      return round.projectCount === 0
        ? "Registration open, no projects yet"
        : `Registration open, ${round.projectCount} ${round.projectCount === 1 ? "project" : "projects"} so far`;
    case "Declaration": {
      if (clock && clock.height > round.config.closesAt) return "Declaration has ended, ready to close";
      const distance = blockDistance(round.config.closesAt, clock);
      return distance ? `Declaration closes in ${distance}` : "Declaration open";
    }
    case "Allocation":
      return "Allocation under way, anyone can advance it";
    case "Settlement": {
      const allocated = BigInt(round.config.budget) - BigInt(round.remaining);
      return `Settled, ${formatNearAmount(allocated)} of ${formatNearAmount(round.config.budget)} NEAR allocated`;
    }
  }
}

export function isActive(round: Round): boolean {
  return round.phase !== "Settlement";
}
