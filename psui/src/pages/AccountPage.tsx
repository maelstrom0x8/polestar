import { useQueries } from "@tanstack/react-query";
import { ChevronRight, FolderOpen, LogOut, Vote } from "lucide-react";
import { useMemo } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Container } from "../components/app/Container";
import { PageHeader } from "../components/app/PageHeader";
import { PhasePill, ProjectStatusPill } from "../components/app/StatusPill";
import { EmptyState } from "../components/EmptyState";
import { readActivity } from "../lib/activity";
import { fetchBallot, fetchProject, useAllRounds } from "../lib/contractQueries";
import { useDelayedFlag } from "../lib/useDelayedFlag";
import { useWallet } from "../lib/wallet";
import { WALLET_MANIFEST } from "../lib/walletManifest";

function SupportedRounds({ accountId }: { accountId: string }) {
  const navigate = useNavigate();
  const { rounds, isLoading } = useAllRounds();
  const ballots = useQueries({
    queries: rounds.map((round) => ({
      queryKey: ["ballot", round.id, accountId],
      queryFn: () => fetchBallot(round.id, accountId),
    })),
  });
  const loading = isLoading || ballots.some((q) => q.isLoading);
  const showSkeleton = useDelayedFlag(loading, 500);
  const supported = rounds
    .map((round, i) => ({ round, ballot: ballots[i]?.data }))
    .filter((r) => r.ballot)
    .sort((a, b) => Number(b.round.id) - Number(a.round.id));

  return (
    <Container title="Rounds you supported" note="Checked against the contract for every round it can read.">
      {loading ? (
        showSkeleton && <div className="skeleton" style={{ height: 120, margin: 24 }} aria-hidden />
      ) : supported.length === 0 ? (
        <EmptyState Icon={Vote} message="This account hasn't supported projects in any round yet." action={{ label: "Browse rounds", to: "/rounds" }} />
      ) : (
        <table className="dtable">
          <thead>
            <tr>
              <th scope="col">Round</th>
              <th scope="col">Phase</th>
              <th scope="col" className="dtable__num">
                Projects supported
              </th>
              <th scope="col">
                <span className="visually-hidden">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {supported.map(({ round, ballot }) => (
              <tr key={round.id} className="dtable__row--link" onClick={() => navigate(`/rounds/${round.id}`)}>
                <td className="dtable__cell--lead">
                  <Link to={`/rounds/${round.id}`} className="dtable__primary" onClick={(e) => e.stopPropagation()}>
                    Round {round.id}
                  </Link>
                </td>
                <td className="dtable__cell--plain">
                  <PhasePill phase={round.phase} />
                </td>
                <td className="dtable__num" data-label="Projects supported">
                  {ballot?.approved.length}
                </td>
                <td className="dtable__chevron" aria-hidden>
                  <ChevronRight />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Container>
  );
}

function RegisteredProjects({ accountId }: { accountId: string }) {
  const navigate = useNavigate();
  const entries = useMemo(
    () => readActivity(accountId).filter((e): e is Extract<typeof e, { kind: "project" }> => e.kind === "project"),
    [accountId],
  );
  // Each entry is re-read from the contract, so title and status are live.
  const stored = useQueries({
    queries: entries.map((e) => ({
      queryKey: ["project", e.roundId, e.projectId],
      queryFn: () => fetchProject(e.roundId, e.projectId),
    })),
  });

  return (
    <Container title="Projects you registered" note="From this browser only. The contract keeps no list of projects by proposer.">
      {entries.length === 0 ? (
        <EmptyState Icon={FolderOpen} message="No projects registered from this browser." />
      ) : (
        <table className="dtable">
          <thead>
            <tr>
              <th scope="col">Project</th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="visually-hidden">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => {
              const live = stored[i]?.data;
              const to = `/rounds/${entry.roundId}/projects/${entry.projectId}`;
              return (
                <tr key={`${entry.roundId}-${entry.projectId}`} className="dtable__row--link" onClick={() => navigate(to)}>
                  <td className="dtable__cell--lead">
                    <Link to={to} className="dtable__primary" onClick={(e) => e.stopPropagation()}>
                      {live?.title ?? entry.title}
                    </Link>
                    <span className="dtable__secondary">
                      Round {entry.roundId} · <span className="mono">#{entry.projectId}</span>
                    </span>
                  </td>
                  <td className="dtable__cell--plain">{live && <ProjectStatusPill status={live.status} />}</td>
                  <td className="dtable__chevron" aria-hidden>
                    <ChevronRight />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Container>
  );
}

export function AccountPage() {
  const { accountId, lastWalletId, status, signOut } = useWallet();
  const navigate = useNavigate();

  if (status === "loading") return null;
  if (!accountId) return <Navigate to="/sign-in?next=%2Faccount" replace />;

  const walletName = WALLET_MANIFEST.wallets.find((w) => w.id === lastWalletId)?.name;

  return (
    <div className="page">
      <PageHeader
        title={<span className="mono account-title">{accountId}</span>}
        subtitle={walletName ? `Signed in with ${walletName}` : "Signed in"}
        actions={
          <button
            type="button"
            className="app-btn app-btn--secondary"
            onClick={async () => {
              await signOut();
              navigate("/rounds");
            }}
          >
            <LogOut aria-hidden /> Sign out
          </button>
        }
      />
      <div className="stack">
        <SupportedRounds accountId={accountId} />
        <RegisteredProjects accountId={accountId} />
      </div>
    </div>
  );
}
