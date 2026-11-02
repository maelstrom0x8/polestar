import { Link } from "react-router-dom";
import type { Round } from "../../types/domain";
import { formatNear } from "../../lib/format";
import { PhaseBadge } from "./PhaseBadge";

export function RoundCard({ round }: { round: Round }) {
  const fundedCount = round.projects.filter((p) => p.status === "Funded").length;

  return (
    <Link to={`/rounds/${round.id}`} className="round-card">
      <div className="round-card__header">
        <span className="label">Round {round.id}</span>
        <PhaseBadge phase={round.phase} />
      </div>
      <div className="round-card__stats">
        <div>
          <span className="round-card__stat-value">{formatNear(round.budget)}</span>
          <span className="round-card__stat-label">Budget</span>
        </div>
        <div>
          <span className="round-card__stat-value">{formatNear(round.remaining)}</span>
          <span className="round-card__stat-label">Remaining</span>
        </div>
        <div>
          <span className="round-card__stat-value">
            {fundedCount}/{round.projects.length}
          </span>
          <span className="round-card__stat-label">Funded</span>
        </div>
        <div>
          <span className="round-card__stat-value">{round.ballotCount}</span>
          <span className="round-card__stat-label">Ballots</span>
        </div>
      </div>
    </Link>
  );
}
