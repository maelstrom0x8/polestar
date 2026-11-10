import type { Round } from "../types/domain";
import { relativeTime, type ChainClock } from "./chainClock";
import { formatNearAmount } from "./format";

/** One line that adds to the stage pill rather than repeating it. */
export function roundCue(round: Round, clock: ChainClock | undefined): string {
  switch (round.phase) {
    case "Registration": {
      const deadline = round.config.opensAt - round.config.tMin;
      if (clock && clock.height > deadline) return "Voter registration has closed";
      const when = relativeTime(deadline, clock);
      return when ? `Voter registration closes ${when}` : "Voter registration is open";
    }
    case "Declaration": {
      if (clock && clock.height > round.config.closesAt) return "Voting has ended";
      const when = relativeTime(round.config.closesAt, clock);
      return when ? `Closes ${when}` : "Voting is open";
    }
    case "Allocation":
      return "Results coming soon";
    case "Settlement": {
      const allocated = BigInt(round.config.budget) - BigInt(round.remaining);
      return `${formatNearAmount(allocated)} of ${formatNearAmount(round.config.budget)} NEAR awarded`;
    }
  }
}

export function isActive(round: Round): boolean {
  return round.phase !== "Settlement";
}
