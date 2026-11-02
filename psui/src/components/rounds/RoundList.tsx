import type { Round } from "../../types/domain";
import { RoundCard } from "./RoundCard";

export function RoundList({ rounds }: { rounds: Round[] }) {
  return (
    <div className="round-list">
      {rounds.map((round) => (
        <RoundCard key={round.id} round={round} />
      ))}
    </div>
  );
}
