import { ChevronRight, FolderOpen } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Amount } from "../components/app/Amount";
import { Callout } from "../components/app/Callout";
import { Container } from "../components/app/Container";
import { PageHeader } from "../components/app/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { useAllRounds } from "../lib/contractQueries";
import { useDelayedFlag } from "../lib/useDelayedFlag";

/** "Propose a project" from anywhere: find the round(s) taking proposals. */
export function ProposePage() {
  const navigate = useNavigate();
  const { rounds, isLoading, isError, refetch } = useAllRounds();
  const showSkeleton = useDelayedFlag(isLoading, 500);
  const open = rounds.filter((r) => r.phase === "Registration").sort((a, b) => Number(b.id) - Number(a.id));

  if (!isLoading && !isError && open.length === 1) {
    return <Navigate to={`/rounds/${open[0].id}/propose`} replace />;
  }

  return (
    <div className="page">
      <PageHeader title="Propose a project" subtitle={open.length > 1 ? "Choose a round" : undefined} />
      <div className="narrow">
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
          showSkeleton && <div className="skeleton" style={{ height: 160, borderRadius: 16 }} aria-hidden />
        ) : open.length === 0 ? (
          <Container>
            <EmptyState
              Icon={FolderOpen}
              message="No round is taking proposals right now. Check back soon."
              action={{ label: "See all rounds", to: "/rounds" }}
            />
          </Container>
        ) : (
          <Container title="Rounds taking proposals">
            <table className="dtable">
              <thead>
                <tr>
                  <th scope="col">Round</th>
                  <th scope="col" className="dtable__num">
                    Budget
                  </th>
                  <th scope="col" className="dtable__num">
                    Proposals
                  </th>
                  <th scope="col">
                    <span className="visually-hidden">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {open.map((round) => {
                  const to = `/rounds/${round.id}/propose`;
                  return (
                    <tr key={round.id} className="dtable__row--link" onClick={() => navigate(to)}>
                      <td className="dtable__cell--lead">
                        <Link to={to} className="dtable__primary" onClick={(e) => e.stopPropagation()}>
                          Round {round.id}
                        </Link>
                      </td>
                      <td className="dtable__num" data-label="Budget">
                        <Amount yocto={round.config.budget} />
                      </td>
                      <td className="dtable__num" data-label="Proposals">
                        {round.projectCount}
                      </td>
                      <td className="dtable__chevron" aria-hidden>
                        <ChevronRight />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Container>
        )}
      </div>
    </div>
  );
}
