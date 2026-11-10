import { FolderOpen, SearchX } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Callout } from "../components/app/Callout";
import { Container } from "../components/app/Container";
import { KeyFigure } from "../components/app/KeyFigure";
import { PageHeader } from "../components/app/PageHeader";
import { PhasePill } from "../components/app/StatusPill";
import { EmptyState } from "../components/EmptyState";
import { AllocationLog } from "../components/round/AllocationLog";
import { BallotSection } from "../components/round/BallotSection";
import { EligibilityNotice } from "../components/round/EligibilityNotice";
import { PhaseCard } from "../components/round/PhaseCard";
import { ProjectsTable } from "../components/round/ProjectsTable";
import { ResultsSection } from "../components/round/ResultsSection";
import { useAllocationRunner } from "../lib/allocationRunner";
import { useChainClock } from "../lib/chainClock";
import { useAllocationResult, useProjects, useRound } from "../lib/contractQueries";
import { formatNearAmount } from "../lib/format";
import { ContractPanicError } from "../lib/near";
import { useDelayedFlag } from "../lib/useDelayedFlag";
import { useMediaQuery } from "../lib/useMediaQuery";
import type { Project, Round } from "../types/domain";

function RoundSkeleton() {
  return (
    <div className="detail" aria-hidden>
      <div className="detail__main">
        <div className="skeleton" style={{ height: 180, borderRadius: 16 }} />
        <div className="skeleton" style={{ height: 240, borderRadius: 16 }} />
      </div>
      <div className="detail__aside">
        <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
      </div>
    </div>
  );
}

function RoundFigure({ round, projects }: { round: Round; projects: Project[] }) {
  if (round.phase === "Settlement") {
    const allocated = BigInt(round.config.budget) - BigInt(round.remaining);
    const funded = projects.filter((p) => p.status === "Funded").length;
    return (
      <KeyFigure
        label="Awarded"
        value={formatNearAmount(allocated)}
        unit={`of ${formatNearAmount(round.config.budget)} NEAR`}
        items={[
          { label: "Projects funded", value: `${funded} of ${round.projectCount}` },
          { label: "Voters", value: round.ballotCount },
        ]}
      />
    );
  }
  return (
    <KeyFigure
      label="Budget"
      value={formatNearAmount(round.config.budget)}
      unit="NEAR"
      items={[
        ...(round.phase === "Allocation" ? [{ label: "Still to share", value: formatNearAmount(round.remaining) }] : []),
        { label: "Projects", value: round.projectCount },
        ...(round.phase === "Registration" ? [] : [{ label: "Voters", value: round.ballotCount }]),
      ]}
    />
  );
}

function PhaseContent({ round, projects }: { round: Round; projects: Project[] }) {
  const { data: clock } = useChainClock();
  const resultQuery = useAllocationResult(round.phase === "Settlement" ? round.id : undefined);

  switch (round.phase) {
    case "Registration":
      return (
        <Container title="Proposals">
          {projects.length === 0 ? (
            <EmptyState
              Icon={FolderOpen}
              message="No proposals yet. Be the first."
              action={{ label: "Propose a project", to: `/rounds/${round.id}/propose` }}
            />
          ) : (
            <ProjectsTable roundId={round.id} projects={projects} showStatus={false} />
          )}
        </Container>
      );
    case "Declaration":
      return <BallotSection round={round} projects={projects} clock={clock} />;
    case "Allocation":
      return null;
    case "Settlement":
      return <ResultsSection roundId={round.id} projects={projects} result={resultQuery.data} />;
  }
}

export function RoundPage() {
  const { roundId = "" } = useParams();
  const validId = /^\d+$/.test(roundId) ? roundId : undefined;
  const roundQuery = useRound(validId);
  const projectsQuery = useProjects(validId);
  const { data: clock } = useChainClock();
  const round = roundQuery.data;
  const projects = projectsQuery.data ?? [];
  const runner = useAllocationRunner(roundId, projects);
  const loading = roundQuery.isLoading || projectsQuery.isLoading;
  const showSkeleton = useDelayedFlag(loading, 500);
  const wide = useMediaQuery("(min-width: 960px)");

  const crumbs = [{ label: "Rounds", to: "/rounds" }, { label: `Round ${roundId}` }];

  if (!validId || roundQuery.data === null) {
    return (
      <div className="page">
        <PageHeader crumbs={crumbs} title={`Round ${roundId}`} />
        <Container>
          <EmptyState Icon={SearchX} message={`There's no round ${roundId}.`} action={{ label: "See all rounds", to: "/rounds" }} />
        </Container>
      </div>
    );
  }

  if (roundQuery.error instanceof ContractPanicError) {
    return (
      <div className="page">
        <PageHeader crumbs={crumbs} title={`Round ${roundId}`} />
        <Container>
          <EmptyState Icon={SearchX} message="This round isn't available." action={{ label: "See all rounds", to: "/rounds" }} />
        </Container>
      </div>
    );
  }

  if (roundQuery.isError || projectsQuery.isError) {
    return (
      <div className="page">
        <PageHeader crumbs={crumbs} title={`Round ${roundId}`} />
        <Callout
          tone="error"
          role="alert"
          title="Couldn't load this round"
          action={
            <button
              type="button"
              className="app-btn app-btn--secondary"
              onClick={() => {
                void roundQuery.refetch();
                void projectsQuery.refetch();
              }}
            >
              Try again
            </button>
          }
        >
          Check your connection and try again.
        </Callout>
      </div>
    );
  }

  if (loading || !round) {
    return (
      <div className="page">
        <PageHeader crumbs={crumbs} title={`Round ${roundId}`} />
        {showSkeleton && <RoundSkeleton />}
      </div>
    );
  }

  // Only while registering is still possible; during voting there is nothing to act on.
  const showEligibility = round.phase === "Registration";

  return (
    <div className="page">
      <PageHeader
        crumbs={crumbs}
        title={`Round ${round.id}`}
        badge={<PhasePill phase={round.phase} />}
        actions={
          round.phase === "Registration" ? (
            <Link to={`/rounds/${round.id}/propose`} className="app-btn app-btn--primary">
              Propose a project
            </Link>
          ) : undefined
        }
      />
      <div className="detail">
        <div className="detail__main">
          <RoundFigure round={round} projects={projects} />
          {!wide && <PhaseCard round={round} clock={clock} runner={runner} />}
          {showEligibility && <EligibilityNotice round={round} clock={clock} />}
          {round.phase === "Allocation" ? (
            <AllocationLog roundId={round.id} projects={projects} log={runner.log} />
          ) : (
            <PhaseContent round={round} projects={projects} />
          )}
        </div>
        {wide && (
          <aside className="detail__aside">
            <PhaseCard round={round} clock={clock} runner={runner} />
          </aside>
        )}
      </div>
    </div>
  );
}
