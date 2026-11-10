import { Check } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { recordActivity } from "../../lib/activity";
import type { ChainClock } from "../../lib/chainClock";
import { useBallot } from "../../lib/contractQueries";
import { formatNear } from "../../lib/format";
import { useRefreshRound } from "../../lib/roundData";
import { TGAS } from "../../lib/tx";
import { useWallet } from "../../lib/wallet";
import type { Project, Round } from "../../types/domain";
import { Amount } from "../app/Amount";
import { Callout } from "../app/Callout";
import { Container } from "../app/Container";
import { TxFlow } from "../app/TxFlow";

function ProjectChoice({ project, checked, onToggle, roundId }: { project: Project; checked: boolean; onToggle: () => void; roundId: string }) {
  return (
    <li>
      <label className={`choice${checked ? " choice--checked" : ""}`}>
        <input type="checkbox" checked={checked} onChange={onToggle} className="choice__input" />
        <span className="choice__box" aria-hidden>
          {checked && <Check strokeWidth={3} />}
        </span>
        <span className="choice__text">
          <span className="choice__title">{project.title}</span>
          <span className="choice__meta">
            by <span className="mono">{project.proposer}</span> ·{" "}
            <Link to={`/rounds/${roundId}/projects/${project.id}`} onClick={(e) => e.stopPropagation()} className="app-link">
              Details
            </Link>
          </span>
        </span>
        <span className="choice__cost">
          <Amount yocto={project.cost} />
        </span>
      </label>
    </li>
  );
}

export function BallotSection({ round, projects, clock }: { round: Round; projects: Project[]; clock: ChainClock | undefined }) {
  const { accountId } = useWallet();
  const ballotQuery = useBallot(round.id, accountId ?? undefined);
  const refresh = useRefreshRound(round.id);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reviewing, setReviewing] = useState(false);
  const ended = clock !== undefined && clock.height > round.config.closesAt;

  const ballot = ballotQuery.data;
  if (ballot) {
    const supported = projects.filter((p) => ballot.approved.includes(p.id));
    return (
      <Container title="Your vote">
        <div className="container__body">
          <p>
            You supported {supported.length} {supported.length === 1 ? "project" : "projects"} in this round. Votes
            can't be changed once cast.
          </p>
          <ul className="plain-list">
            {supported.map((p) => (
              <li key={p.id}>
                <Check aria-hidden size={16} className="plain-list__icon" />
                <Link to={`/rounds/${round.id}/projects/${p.id}`} className="app-link">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    );
  }

  if (ended) {
    return (
      <Callout tone="info" title="Voting has ended">
        The votes are in. They'll be counted once someone ends voting for this round.
      </Callout>
    );
  }

  const chosen = projects.filter((p) => selected.has(p.id));
  const asked = chosen.reduce((sum, p) => sum + BigInt(p.cost), 0n);

  if (reviewing) {
    return (
      <Container>
        <div className="container__body">
          <TxFlow
            title="Review your vote"
            progressTitle="Casting your vote"
            figure="No deposit"
            figureCaption="Network fee shown by your wallet"
            summary={`You're voting for ${chosen.length} ${chosen.length === 1 ? "project" : "projects"} in Round ${round.id}. Your vote can't be changed once it's cast.`}
            lines={chosen.map((p) => ({ label: p.title, value: formatNear(p.cost) }))}
            call={{
              method: "submit_ballot",
              args: { round_id: Number(round.id), approved: chosen.map((p) => Number(p.id)) },
              deposit: 0n,
              gas: 50n * TGAS,
            }}
            onBack={() => setReviewing(false)}
            onConfirmed={async () => {
              if (accountId) recordActivity(accountId, { kind: "ballot", roundId: round.id, count: chosen.length, at: Date.now() });
              await refresh();
            }}
            renderDone={() => <p>Your vote is in.</p>}
          />
        </div>
      </Container>
    );
  }

  return (
    <Container title="Your vote" headerAction={<span className="muted" style={{ fontSize: "var(--app-small)" }}>Pick every project you support</span>}>
      <ul className="choice-list">
        {projects.map((project) => (
          <ProjectChoice
            key={project.id}
            project={project}
            roundId={round.id}
            checked={selected.has(project.id)}
            onToggle={() =>
              setSelected((prev) => {
                const next = new Set(prev);
                if (next.has(project.id)) next.delete(project.id);
                else next.add(project.id);
                return next;
              })
            }
          />
        ))}
      </ul>
      <div className="choice-footer">
        <p className="choice-footer__summary" aria-live="polite">
          {chosen.length === 0
            ? "Nothing selected yet."
            : `${chosen.length} selected, asking ${formatNear(asked)} in total. The round's budget is ${formatNear(round.config.budget)}.`}
        </p>
        <button type="button" className="app-btn app-btn--primary" disabled={chosen.length === 0} onClick={() => setReviewing(true)}>
          Review
        </button>
      </div>
    </Container>
  );
}
