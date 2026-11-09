import { FolderOpen, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { RoundList } from "../components/rounds/RoundList";
import { useAllRounds } from "../lib/contractQueries";
import { useDelayedFlag } from "../lib/useDelayedFlag";
import type { RoundPhase } from "../types/domain";

const PHASES: readonly RoundPhase[] = ["Registration", "Declaration", "Allocation", "Settlement"];

function RoundsSkeleton() {
  return (
    <div className="round-list" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="round-card round-card--skeleton" />
      ))}
    </div>
  );
}

export function RoundsPage() {
  const { isLoading, isError, rounds } = useAllRounds();
  const showSkeleton = useDelayedFlag(isLoading, 500);
  const [phaseFilter, setPhaseFilter] = useState<RoundPhase | "All">("All");

  const filtered = useMemo(
    () => (phaseFilter === "All" ? rounds : rounds.filter((round) => round.phase === phaseFilter)),
    [rounds, phaseFilter],
  );

  return (
    <div className="page rounds-page">
      <h1 className="h1">Rounds</h1>
      <p className="rounds-page__subhead">Browse funding rounds and see what's open.</p>

      {!isLoading && !isError && rounds.length > 0 && (
        <div className="rounds-page__filters" role="group" aria-label="Filter by phase">
          <button
            type="button"
            className={`chip${phaseFilter === "All" ? " chip--active" : ""}`}
            onClick={() => setPhaseFilter("All")}
          >
            All
          </button>
          {PHASES.map((phase) => (
            <button
              key={phase}
              type="button"
              className={`chip${phaseFilter === phase ? " chip--active" : ""}`}
              onClick={() => setPhaseFilter(phase)}
            >
              {phase}
            </button>
          ))}
        </div>
      )}

      {isError ? (
        <EmptyState
          Icon={WifiOff}
          message="Couldn't reach the network. Check your connection and try again."
        />
      ) : isLoading ? (
        showSkeleton && <RoundsSkeleton />
      ) : rounds.length === 0 ? (
        <EmptyState Icon={FolderOpen} message="No rounds have been created yet." />
      ) : filtered.length === 0 ? (
        <EmptyState Icon={FolderOpen} message={`No rounds in ${phaseFilter}.`} />
      ) : (
        <RoundList rounds={filtered} />
      )}
    </div>
  );
}
