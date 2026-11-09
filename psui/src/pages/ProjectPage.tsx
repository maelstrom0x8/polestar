import { Check, CircleDashed, SearchX } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Amount } from "../components/app/Amount";
import { Callout } from "../components/app/Callout";
import { Container } from "../components/app/Container";
import { KeyValueList } from "../components/app/KeyValueList";
import { PageHeader } from "../components/app/PageHeader";
import { PhasePill, ProjectStatusPill } from "../components/app/StatusPill";
import { Timeline, type TimelineStep } from "../components/app/Timeline";
import { EmptyState } from "../components/EmptyState";
import { useAllocationResult, useProject, useProjectSupport, useRound } from "../lib/contractQueries";
import { formatNear } from "../lib/format";
import { ContractPanicError } from "../lib/near";
import { STAGE_LABEL } from "../lib/roundData";
import { useDelayedFlag } from "../lib/useDelayedFlag";
import type { Project, Round } from "../types/domain";

function projectSteps(project: Project, round: Round, support: number | undefined): TimelineStep[] {
  const votingDone = round.phase === "Allocation" || round.phase === "Settlement";
  const paid = project.milestones.filter((m) => m.attested).length;
  const decided = project.status !== "Pending";
  const steps: TimelineStep[] = [
    { key: "registered", title: "Registered", state: "done" },
    {
      key: "support",
      title: "Community support",
      state: votingDone ? "done" : round.phase === "Declaration" ? "current" : "upcoming",
      detail:
        round.phase === "Registration"
          ? "Opens when the round moves to declaration."
          : support === undefined
            ? undefined
            : `Supported by ${support} ${support === 1 ? "person" : "people"}${votingDone ? "" : " so far"}.`,
    },
    {
      key: "decision",
      title: project.status === "Unfunded" ? "Not funded" : "Funded",
      state: project.status === "Unfunded" ? "skipped" : decided ? "done" : round.phase === "Allocation" ? "current" : "upcoming",
      detail:
        project.status === "Unfunded"
          ? "What was left of the budget couldn't cover it. That's an expected outcome of the allocation, not an error."
          : round.phase === "Allocation" && !decided
            ? "The allocation is still running."
            : undefined,
    },
  ];
  if (project.status !== "Unfunded") {
    steps.push({
      key: "paid",
      title: "Paid out",
      state: project.status === "Funded" ? (paid === project.milestones.length ? "done" : "current") : "upcoming",
      detail:
        project.status === "Funded"
          ? paid === project.milestones.length
            ? "Every milestone has been paid."
            : `${paid} of ${project.milestones.length} milestones paid. Waiting for the DAO to confirm milestone ${paid + 1}.`
          : undefined,
    });
  }
  return steps;
}

export function ProjectPage() {
  const { roundId = "", projectId = "" } = useParams();
  const valid = /^\d+$/.test(roundId) && /^\d+$/.test(projectId);
  const projectQuery = useProject(valid ? roundId : undefined, valid ? projectId : undefined);
  const roundQuery = useRound(valid ? roundId : undefined);
  const supportQuery = useProjectSupport(valid ? roundId : undefined, valid ? projectId : undefined);
  const resultQuery = useAllocationResult(roundQuery.data?.phase === "Settlement" ? roundId : undefined);
  const loading = projectQuery.isLoading || roundQuery.isLoading;
  const showSkeleton = useDelayedFlag(loading, 500);

  const project = projectQuery.data;
  const round = roundQuery.data;
  const crumbs = [
    { label: "Rounds", to: "/rounds" },
    { label: `Round ${roundId}`, to: `/rounds/${roundId}` },
    { label: project?.title ?? `Project ${projectId}` },
  ];

  if (!valid || projectQuery.data === null || roundQuery.data === null) {
    return (
      <div className="page">
        <PageHeader crumbs={crumbs} title={`Project ${projectId}`} />
        <Container>
          <EmptyState
            Icon={SearchX}
            message={`There's no project ${projectId} in round ${roundId}.`}
            action={{ label: `Back to Round ${roundId}`, to: `/rounds/${roundId}` }}
          />
        </Container>
      </div>
    );
  }

  if (roundQuery.error instanceof ContractPanicError || projectQuery.error instanceof ContractPanicError) {
    return (
      <div className="page">
        <PageHeader crumbs={crumbs} title={`Project ${projectId}`} />
        <Callout tone="info" title="This project can't be shown">
          Its round was created by an earlier version of the contract, which the current one can no longer read.
        </Callout>
      </div>
    );
  }

  if (projectQuery.isError || roundQuery.isError) {
    return (
      <div className="page">
        <PageHeader crumbs={crumbs} title={`Project ${projectId}`} />
        <Callout
          tone="error"
          role="alert"
          title="Couldn't reach the NEAR network"
          action={
            <button
              type="button"
              className="app-btn app-btn--secondary"
              onClick={() => {
                void projectQuery.refetch();
                void roundQuery.refetch();
              }}
            >
              Try again
            </button>
          }
        />
      </div>
    );
  }

  if (loading || !project || !round) {
    return (
      <div className="page">
        <PageHeader crumbs={crumbs} title=" " />
        {showSkeleton && <div className="skeleton" style={{ height: 320, borderRadius: 16 }} aria-hidden />}
      </div>
    );
  }

  const record = resultQuery.data?.funded.find((f) => f.project === project.id);
  const support = round.phase === "Registration" ? undefined : supportQuery.data;

  return (
    <div className="page">
      <PageHeader crumbs={crumbs} title={project.title} badge={<ProjectStatusPill status={project.status} />} />
      <div className="detail">
        <div className="detail__main">
          <Container title="About this project">
            <div className="container__body">
              <p className="project-summary">{project.summary}</p>
              <div style={{ marginTop: 24 }}>
                <KeyValueList
                  rows={[
                    { label: "Asking for", value: formatNear(project.cost, true), mono: true },
                    ...(record ? [{ label: "Funded via", value: STAGE_LABEL[record.stage] }] : []),
                    { label: "Proposed by", value: project.proposer, mono: true },
                    { label: "Paid to", value: project.recipient, mono: true },
                    {
                      label: "Supporters",
                      value: support === undefined ? "Not open yet" : support,
                    },
                    {
                      label: "Round",
                      value: (
                        <Link to={`/rounds/${round.id}`} className="app-link">
                          Round {round.id}
                        </Link>
                      ),
                    },
                    { label: "Round phase", value: <PhasePill phase={round.phase} /> },
                    { label: "Project id", value: `#${project.id}`, mono: true },
                  ]}
                />
              </div>
            </div>
          </Container>
          <Container title="Milestones" headerAction={<span className="muted" style={{ fontSize: "var(--app-small)" }}>{project.milestones.filter((m) => m.attested).length} of {project.milestones.length} paid</span>}>
            <ol className="milestone-list">
              {project.milestones.map((milestone, i) => (
                <li key={i} className="milestone-list__item">
                  <span className="milestone-list__index">{i + 1}</span>
                  <span className="milestone-list__amount">
                    <Amount yocto={milestone.amount} />
                  </span>
                  <span className={`milestone-list__state${milestone.attested ? " milestone-list__state--paid" : ""}`}>
                    {milestone.attested ? (
                      <>
                        <Check aria-hidden size={16} /> Paid
                      </>
                    ) : project.status === "Funded" ? (
                      <>
                        <CircleDashed aria-hidden size={16} /> Awaiting DAO confirmation
                      </>
                    ) : project.status === "Unfunded" ? (
                      "Not funded"
                    ) : (
                      "Pending the allocation"
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </Container>
        </div>
        <aside className="detail__aside">
          <section className="container">
            <div className="container__header">
              <h2 className="container__title">Progress</h2>
            </div>
            <div className="container__body">
              <Timeline label="Project progress" steps={projectSteps(project, round, support)} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
