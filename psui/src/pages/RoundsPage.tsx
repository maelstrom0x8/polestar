import { ChevronRight, FolderOpen } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Callout } from "../components/app/Callout";
import { Container } from "../components/app/Container";
import { PageHeader } from "../components/app/PageHeader";
import { PhasePill } from "../components/app/StatusPill";
import { Tabs } from "../components/app/Tabs";
import { EmptyState } from "../components/EmptyState";
import { useChainClock } from "../lib/chainClock";
import { useAllRounds } from "../lib/contractQueries";
import { Amount } from "../components/app/Amount";
import { isActive, roundCue } from "../lib/roundCue";
import { useDelayedFlag } from "../lib/useDelayedFlag";
import type { Round } from "../types/domain";

type TabId = "active" | "settled" | "all";

function listIds(ids: string[]): string {
  const tagged = ids.map((id) => `#${id}`);
  return tagged.length <= 1 ? tagged.join("") : `${tagged.slice(0, -1).join(", ")} and ${tagged[tagged.length - 1]}`;
}

function RoundsSkeleton() {
  return (
    <Container toolbar={<div className="skeleton" style={{ height: 20, width: 220, margin: "18px 0" }} />}>
      <div aria-hidden style={{ padding: "8px 24px 24px", display: "grid", gap: 16 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton" style={{ height: 44 }} />
        ))}
      </div>
    </Container>
  );
}

function RoundRow({ round, cue }: { round: Round; cue: string }) {
  const navigate = useNavigate();
  const to = `/rounds/${round.id}`;
  return (
    <tr className="dtable__row--link" onClick={() => navigate(to)}>
      <td className="dtable__id">#{round.id}</td>
      <td className="dtable__cell--lead">
        <Link to={to} className="dtable__primary" onClick={(e) => e.stopPropagation()}>
          Round {round.id}
        </Link>
        <span className="dtable__secondary">{cue}</span>
      </td>
      <td className="dtable__cell--plain">
        <PhasePill phase={round.phase} />
      </td>
      <td className="dtable__num" data-label="Budget">
        <Amount yocto={round.config.budget} />
      </td>
      <td className="dtable__num" data-label="Projects">
        {round.projectCount}
      </td>
      <td className="dtable__num" data-label="Voters">
        {round.ballotCount}
      </td>
      <td className="dtable__chevron" aria-hidden>
        <ChevronRight />
      </td>
    </tr>
  );
}

export function RoundsPage() {
  const { isLoading, isError, rounds, failedIds, refetch } = useAllRounds();
  const { data: clock } = useChainClock();
  const showSkeleton = useDelayedFlag(isLoading, 500);
  const [chosenTab, setChosenTab] = useState<TabId | null>(null);

  const sorted = useMemo(() => [...rounds].sort((a, b) => Number(b.id) - Number(a.id)), [rounds]);
  const active = sorted.filter(isActive);
  const settled = sorted.filter((r) => !isActive(r));
  const tab: TabId = chosenTab ?? (active.length > 0 ? "active" : "all");
  const visible = tab === "active" ? active : tab === "settled" ? settled : sorted;

  return (
    <div className="page">
      <PageHeader
        title="Rounds"
        subtitle="Funding rounds and where each one stands"
        actions={
          <Link to="/propose" className="app-btn app-btn--primary">
            Propose a project
          </Link>
        }
      />

      {isError ? (
        <Callout
          tone="error"
          role="alert"
          title="Couldn't load rounds"
          action={
            <button type="button" className="app-btn app-btn--secondary" onClick={refetch}>
              Try again
            </button>
          }
        >
          Check your connection and try again.
        </Callout>
      ) : isLoading ? (
        showSkeleton && <RoundsSkeleton />
      ) : sorted.length === 0 ? (
        <Container>
          <EmptyState
            Icon={FolderOpen}
            message="There are no funding rounds yet. Check back soon."
          />
        </Container>
      ) : (
        <>
          {failedIds.length > 0 && (
            <Callout
              tone="error"
              role="alert"
              title={`Round ${listIds(failedIds)} couldn't be loaded`}
              action={
                <button type="button" className="app-btn app-btn--secondary" onClick={refetch}>
                  Try again
                </button>
              }
            >
              Check your connection and try again. The rest of the list is up to date.
            </Callout>
          )}
          <Container
            toolbar={
              <Tabs
                label="Filter rounds"
                value={tab}
                onChange={setChosenTab}
                items={[
                  { id: "active", label: "Active", count: active.length },
                  { id: "settled", label: "Completed", count: settled.length },
                  { id: "all", label: "All", count: sorted.length },
                ]}
              />
            }
          >
            {visible.length === 0 ? (
              <EmptyState
                Icon={FolderOpen}
                message={tab === "active" ? "No rounds are open right now." : "No completed rounds yet."}
                action={
                  tab === "active" && settled.length > 0
                    ? { label: "See completed rounds", onClick: () => setChosenTab("settled") }
                    : undefined
                }
              />
            ) : (
              <table className="dtable">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Round</th>
                    <th scope="col">Stage</th>
                    <th scope="col" className="dtable__num">
                      Budget
                    </th>
                    <th scope="col" className="dtable__num">
                      Projects
                    </th>
                    <th scope="col" className="dtable__num">
                      Voters
                    </th>
                    <th scope="col">
                      <span className="visually-hidden">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((round) => (
                    <RoundRow key={round.id} round={round} cue={roundCue(round, clock)} />
                  ))}
                </tbody>
              </table>
            )}
          </Container>
        </>
      )}
    </div>
  );
}
