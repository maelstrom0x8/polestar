import { useQueryClient } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Callout } from "../components/app/Callout";
import { Container } from "../components/app/Container";
import { FieldShell, TextField } from "../components/app/Form";
import { PageHeader } from "../components/app/PageHeader";
import { Tabs } from "../components/app/Tabs";
import { TxFlow } from "../components/app/TxFlow";
import { EmptyState } from "../components/EmptyState";
import { relativeTime, useChainClock, type ChainClock } from "../lib/chainClock";
import { useAllRounds, useProjects } from "../lib/contractQueries";
import {
  approvals,
  canSubmit,
  canVote,
  describeProposal,
  useDaoPolicy,
  useOpenProposals,
  type DaoPolicy,
  type DaoProposal,
} from "../lib/dao";
import { isValidAccountId } from "../lib/accountId";
import { formatNear, parseNear } from "../lib/format";
import { polestar } from "../lib/polestar";
import { signInHref } from "../lib/returnPath";
import type { ContractCall } from "../lib/tx";
import { useWallet } from "../lib/wallet";

type Mode = "fund" | "milestone" | "return";
type Unit = "minutes" | "hours" | "days";
const UNIT_MS: Record<Unit, number> = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 };

function useRefreshAfterDecision() {
  const client = useQueryClient();
  return async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["daoProposals"] }),
      client.invalidateQueries({ queryKey: ["roundCount"] }),
      client.invalidateQueries({ queryKey: ["round"] }),
      client.invalidateQueries({ queryKey: ["projects"] }),
      client.invalidateQueries({ queryKey: ["project"] }),
    ]);
  };
}

function OpenProposal({ proposal, policy }: { proposal: DaoProposal; policy: DaoPolicy }) {
  const { accountId } = useWallet();
  const refresh = useRefreshAfterDecision();
  const [voting, setVoting] = useState<null | "VoteApprove" | "VoteReject">(null);
  const { title, detail } = describeProposal(proposal);
  const voted = accountId ? proposal.votes[accountId] : undefined;
  const mayVote = accountId ? canVote(policy, accountId) : false;

  if (voting) {
    const approving = voting === "VoteApprove";
    return (
      <li className="proposal">
        <TxFlow
          title={approving ? "Approve this proposal" : "Reject this proposal"}
          progressTitle={approving ? "Approving" : "Rejecting"}
          figure="No deposit"
          figureCaption="Network fee shown by your wallet"
          summary={
            approving
              ? `You're approving "${proposal.description}". It takes effect as soon as enough council members approve.`
              : `You're rejecting "${proposal.description}".`
          }
          lines={[{ label: title, value: detail }]}
          call={polestar.governance.calls.vote(proposal, voting)}
          onBack={() => setVoting(null)}
          onConfirmed={refresh}
          renderDone={() => <p>Your vote is in.</p>}
        />
      </li>
    );
  }

  return (
    <li className="proposal">
      <div className="proposal__text">
        <span className="proposal__title">{proposal.description || title}</span>
        <span className="proposal__detail">
          {title} · {detail} · {approvals(proposal)} {approvals(proposal) === 1 ? "approval" : "approvals"} so far
        </span>
      </div>
      {voted ? (
        <span className="muted" style={{ fontSize: "var(--app-small)" }}>
          You voted
        </span>
      ) : mayVote ? (
        <div className="proposal__actions">
          <button type="button" className="app-btn app-btn--secondary" onClick={() => setVoting("VoteReject")}>
            Reject
          </button>
          <button type="button" className="app-btn app-btn--primary" onClick={() => setVoting("VoteApprove")}>
            Approve
          </button>
        </div>
      ) : (
        <span className="muted" style={{ fontSize: "var(--app-small)" }}>
          Waiting for the council
        </span>
      )}
    </li>
  );
}

function OpenProposals({ policy }: { policy: DaoPolicy | undefined }) {
  const { data, isLoading, isError, refetch } = useOpenProposals();
  return (
    <Container title="Waiting for approval">
      {isError ? (
        <div className="container__body">
          <Callout
            tone="error"
            title="Couldn't load proposals"
            action={
              <button type="button" className="app-btn app-btn--secondary" onClick={() => void refetch()}>
                Try again
              </button>
            }
          />
        </div>
      ) : isLoading || !policy ? (
        <div className="skeleton" style={{ height: 64, margin: 24 }} aria-hidden />
      ) : data && data.length > 0 ? (
        <ul className="proposal-list">
          {data.map((p) => (
            <OpenProposal key={p.id} proposal={p} policy={policy} />
          ))}
        </ul>
      ) : (
        <EmptyState Icon={Inbox} message="Nothing is waiting for approval." />
      )}
    </Container>
  );
}

function DurationField({
  label,
  value,
  unit,
  onValue,
  onUnit,
  hint,
  error,
}: {
  label: string;
  value: string;
  unit: Unit;
  onValue: (v: string) => void;
  onUnit: (u: Unit) => void;
  hint?: string;
  error?: string | null;
}) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      {({ inputId, describedBy }) => (
        <div className="duration">
          <div className={`form-input${error ? " form-input--invalid" : ""}`}>
            <input id={inputId} aria-describedby={describedBy} inputMode="numeric" value={value} onChange={(e) => onValue(e.target.value)} />
          </div>
          <div className="form-input duration__unit">
            <select aria-label={`${label} unit`} value={unit} onChange={(e) => onUnit(e.target.value as Unit)}>
              <option value="minutes">minutes</option>
              <option value="hours">hours</option>
              <option value="days">days</option>
            </select>
          </div>
        </div>
      )}
    </FieldShell>
  );
}

function blocksFor(ms: number, clock: ChainClock | undefined): number | null {
  return clock?.msPerBlock ? Math.ceil(ms / clock.msPerBlock) : null;
}

/** The bond goes back to whoever submitted once the proposal is decided. */
function SubmitFlow({ call, summary, lines, onDone }: { call: ContractCall; summary: string; lines: { label: string; value: string }[]; onDone: () => void }) {
  const refresh = useRefreshAfterDecision();
  return (
    <TxFlow
      title="Review your proposal"
      progressTitle="Submitting"
      figure={formatNear(call.deposit, true)}
      figureCaption="Bond, returned once the proposal is decided · network fee shown by your wallet"
      summary={summary}
      lines={lines}
      call={call}
      onBack={onDone}
      onConfirmed={refresh}
      renderDone={() => (
        <p>
          Submitted. It's now waiting for approval above.{" "}
          <button type="button" className="app-btn app-btn--ghost" onClick={onDone}>
            Start another
          </button>
        </p>
      )}
    />
  );
}

function FundRoundForm({ bond }: { bond: bigint }) {
  const { data: clock } = useChainClock();
  const [budget, setBudget] = useState("");
  const [regValue, setRegValue] = useState("1");
  const [regUnit, setRegUnit] = useState<Unit>("days");
  const [voteValue, setVoteValue] = useState("3");
  const [voteUnit, setVoteUnit] = useState<Unit>("days");
  const [description, setDescription] = useState<string | null>(null);
  const [membersOnly, setMembersOnly] = useState(true);
  const [namespace, setNamespace] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [review, setReview] = useState<ContractCall | null>(null);

  const budgetYocto = parseNear(budget);
  const regMs = Number(regValue) * UNIT_MS[regUnit];
  const voteMs = Number(voteValue) * UNIT_MS[voteUnit];
  const regBlocks = Number.isFinite(regMs) && regMs > 0 ? blocksFor(regMs, clock) : null;
  const voteBlocks = Number.isFinite(voteMs) && voteMs > 0 ? blocksFor(voteMs, clock) : null;
  const desc = description ?? (budgetYocto ? `Fund a community round with ${formatNear(budgetYocto, true)}` : "Fund a community round");

  const errors = {
    budget: budget && (budgetYocto === null || budgetYocto === 0n) ? "Enter an amount above zero." : null,
    reg: regBlocks === null && regValue ? "Enter a length of time." : null,
    vote:
      voteBlocks !== null && regBlocks !== null && voteBlocks <= regBlocks
        ? "Voting has to close after registration does."
        : voteBlocks === null && voteValue
          ? "Enter a length of time."
          : null,
    namespace: membersOnly && namespace && !isValidAccountId(namespace) ? "Enter a NEAR account name, like guild.near." : null,
  };
  const namespaceOk = !membersOnly || isValidAccountId(namespace);
  const ready = !!clock && budgetYocto !== null && budgetYocto > 0n && regBlocks !== null && voteBlocks !== null && voteBlocks > regBlocks && namespaceOk;

  if (review) {
    return (
      <SubmitFlow
        call={review}
        summary={`You're proposing a new round with a ${formatNear(budgetYocto ?? 0n, true)} budget, paid from the shared treasury once approved.`}
        lines={[
          { label: "Budget", value: formatNear(budgetYocto ?? 0n, true) },
          { label: "Voter registration closes", value: relativeTime((clock?.height ?? 0) + (regBlocks ?? 0), clock) ?? "" },
          { label: "Voting closes", value: relativeTime((clock?.height ?? 0) + (voteBlocks ?? 0), clock) ?? "" },
          { label: "Who can vote", value: membersOnly ? `Members of ${namespace}` : "Anyone who registers" },
        ]}
        onDone={() => setReview(null)}
      />
    );
  }

  return (
    <form
      className="container__body form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
        if (!ready || !clock) return;
        // Heights are fixed now, from the measured block time; the round
        // closes at these blocks however long approval takes.
        const opensAt = clock.height + (regBlocks as number);
        const closesAt = clock.height + (voteBlocks as number);
        setReview(
          polestar.governance.calls.proposeFundRound(
            {
              budget: budgetYocto as bigint,
              opensAt,
              closesAt,
              tMin: 0,
              ...(membersOnly ? { voterNamespace: namespace } : {}),
            },
            { description: desc, bond },
          ),
        );
      }}
    >
      <TextField
        label="Budget"
        value={budget}
        inputMode="decimal"
        suffix="NEAR"
        placeholder="0.00"
        onChange={(e) => setBudget(e.target.value)}
        hint="Moves from the shared treasury into the round when the proposal is approved."
        error={submitted ? errors.budget ?? (budgetYocto ? null : "Enter a budget.") : errors.budget}
      />
      <DurationField
        label="Voter registration closes in"
        value={regValue}
        unit={regUnit}
        onValue={setRegValue}
        onUnit={setRegUnit}
        hint="Only people registered as voters by then can vote in this round."
        error={errors.reg}
      />
      <DurationField
        label="Voting closes in"
        value={voteValue}
        unit={voteUnit}
        onValue={setVoteValue}
        onUnit={setVoteUnit}
        hint="Counted from now. Voting itself starts once there's a proposal and someone starts it."
        error={errors.vote}
      />
      <FieldShell label="Who can vote">
        {({ inputId }) => (
          <div className="form-input">
            <select id={inputId} value={membersOnly ? "members" : "anyone"} onChange={(e) => setMembersOnly(e.target.value === "members")}>
              <option value="members">Members of a named account</option>
              <option value="anyone">Anyone who registers</option>
            </select>
          </div>
        )}
      </FieldShell>
      {membersOnly && (
        <TextField
          label="Named account"
          value={namespace}
          placeholder="guild.near"
          onChange={(e) => setNamespace(e.target.value.trim().toLowerCase())}
          hint="Only accounts directly under this name can vote, like priya.guild.near. Whoever controls the name decides who gets one."
          error={submitted ? errors.namespace ?? (namespace ? null : "Enter the account name.") : errors.namespace}
        />
      )}
      <TextField label="Description" value={desc} onChange={(e) => setDescription(e.target.value)} />
      {!clock && <p className="form-field__hint">Reading the current block…</p>}
      <div className="form-actions">
        <button type="submit" className="app-btn app-btn--primary" disabled={!clock}>
          Review
        </button>
      </div>
    </form>
  );
}

function MilestoneForm({ bond, initialRound }: { bond: bigint; initialRound: string | null }) {
  const { rounds } = useAllRounds();
  const settled = rounds.filter((r) => r.phase === "Settlement").sort((a, b) => Number(b.id) - Number(a.id));
  const [roundId, setRoundId] = useState<string | null>(initialRound);
  const chosenRound = roundId ?? settled[0]?.id ?? null;
  const projectsQuery = useProjects(chosenRound ?? undefined);
  const funded = (projectsQuery.data ?? []).filter((p) => p.status === "Funded");
  const hasUnpaid = (p: (typeof funded)[number]) => p.milestones.some((m) => !m.attested);
  const [projectId, setProjectId] = useState<string | null>(null);
  const project = funded.find((p) => p.id === projectId) ?? funded.find(hasUnpaid) ?? funded[0];
  const open = project ? project.milestones.map((m, i) => ({ ...m, index: i })).filter((m) => !m.attested) : [];
  const [milestone, setMilestone] = useState<number | null>(null);
  const chosen = open.find((m) => m.index === milestone) ?? open[0];
  const [review, setReview] = useState<ContractCall | null>(null);

  if (settled.length === 0) {
    return (
      <div className="container__body">
        <Callout tone="info">No round has results yet, so there are no milestones to pay.</Callout>
      </div>
    );
  }

  if (review && project && chosen) {
    return (
      <SubmitFlow
        call={review}
        summary={`You're proposing to pay milestone ${chosen.index + 1} of "${project.title}". Once approved, ${formatNear(chosen.amount, true)} goes to ${project.recipient}.`}
        lines={[
          { label: "Project", value: project.title },
          { label: `Milestone ${chosen.index + 1}`, value: formatNear(chosen.amount, true) },
          { label: "Paid to", value: project.recipient },
        ]}
        onDone={() => setReview(null)}
      />
    );
  }

  return (
    <form
      className="container__body form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (chosenRound === null || !project || !chosen) return;
        setReview(
          polestar.governance.calls.proposeMilestonePayment(
            { roundId: Number(chosenRound), projectId: Number(project.id), milestoneIndex: chosen.index },
            { description: `Pay milestone ${chosen.index + 1} of "${project.title}" (Round ${chosenRound})`, bond },
          ),
        );
      }}
    >
      <FieldShell label="Round">
        {({ inputId }) => (
          <div className="form-input">
            <select
              id={inputId}
              value={chosenRound ?? ""}
              onChange={(e) => {
                setRoundId(e.target.value);
                setProjectId(null);
                setMilestone(null);
              }}
            >
              {settled.map((r) => (
                <option key={r.id} value={r.id}>
                  Round {r.id}
                </option>
              ))}
            </select>
          </div>
        )}
      </FieldShell>
      {funded.length === 0 ? (
        <Callout tone="info">No funded projects in this round.</Callout>
      ) : (
        <>
          <FieldShell label="Project">
            {({ inputId }) => (
              <div className="form-input">
                <select
                  id={inputId}
                  value={project?.id ?? ""}
                  onChange={(e) => {
                    setProjectId(e.target.value);
                    setMilestone(null);
                  }}
                >
                  {funded.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                      {hasUnpaid(p) ? "" : " (all paid)"}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </FieldShell>
          {open.length === 0 ? (
            <Callout tone="info">Every milestone of this project has been paid.</Callout>
          ) : (
            <FieldShell label="Milestone" hint="Only milestones that haven't been paid are listed.">
              {({ inputId, describedBy }) => (
                <div className="form-input">
                  <select id={inputId} aria-describedby={describedBy} value={chosen?.index ?? ""} onChange={(e) => setMilestone(Number(e.target.value))}>
                    {open.map((m) => (
                      <option key={m.index} value={m.index}>
                        Milestone {m.index + 1} · {formatNear(m.amount, true)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </FieldShell>
          )}
        </>
      )}
      <div className="form-actions">
        <button type="submit" className="app-btn app-btn--primary" disabled={!chosen}>
          Review
        </button>
      </div>
    </form>
  );
}

function ReturnForm({ bond }: { bond: bigint }) {
  const { rounds } = useAllRounds();
  const returnable = rounds
    .filter((r) => r.phase === "Settlement" && !r.remainingReturned && BigInt(r.remaining) > 0n)
    .sort((a, b) => Number(b.id) - Number(a.id));
  const [roundId, setRoundId] = useState<string | null>(null);
  const round = returnable.find((r) => r.id === roundId) ?? returnable[0];
  const [review, setReview] = useState<ContractCall | null>(null);

  if (!round) {
    return (
      <div className="container__body">
        <Callout tone="info">No finished round has unspent budget to return.</Callout>
      </div>
    );
  }

  if (review) {
    return (
      <SubmitFlow
        call={review}
        summary={`You're proposing to return what Round ${round.id} didn't award. Once approved, ${formatNear(round.remaining, true)} goes back to the treasury. Funded projects are not affected.`}
        lines={[
          { label: "Round", value: `Round ${round.id}` },
          { label: "Unspent", value: formatNear(round.remaining, true) },
        ]}
        onDone={() => setReview(null)}
      />
    );
  }

  return (
    <form
      className="container__body form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setReview(
          polestar.governance.calls.proposeReturnRemaining(Number(round.id), {
            description: `Return the unspent ${formatNear(round.remaining, true)} from Round ${round.id} to the treasury`,
            bond,
          }),
        );
      }}
    >
      <FieldShell label="Round" hint="Finished rounds with budget left over.">
        {({ inputId, describedBy }) => (
          <div className="form-input">
            <select id={inputId} aria-describedby={describedBy} value={round.id} onChange={(e) => setRoundId(e.target.value)}>
              {returnable.map((r) => (
                <option key={r.id} value={r.id}>
                  Round {r.id} · {formatNear(r.remaining, true)} unspent
                </option>
              ))}
            </select>
          </div>
        )}
      </FieldShell>
      <div className="form-actions">
        <button type="submit" className="app-btn app-btn--primary">
          Review
        </button>
      </div>
    </form>
  );
}

export function ProposalsPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const roundParam = params.get("round");
  const { accountId } = useWallet();
  const policyQuery = useDaoPolicy();
  const { rounds } = useAllRounds();
  const settledParam = rounds.find((r) => r.id === roundParam && r.phase === "Settlement");
  const [chosen, setChosen] = useState<Mode | null>(null);
  const mode: Mode = chosen ?? (settledParam ? "milestone" : "fund");
  const policy = policyQuery.data;
  const bond = useMemo(() => (policy ? BigInt(policy.proposal_bond) : 0n), [policy]);

  return (
    <div className="page">
      <PageHeader title="Proposals" subtitle="Funding rounds and paying milestones, approved by the council" />
      <div className="narrow stack">
        <OpenProposals policy={policy} />
        <Container
          toolbar={
            <Tabs
              label="New proposal"
              value={mode}
              onChange={setChosen}
              items={[
                { id: "fund", label: "Fund a round" },
                { id: "milestone", label: "Pay a milestone" },
                { id: "return", label: "Return unspent budget" },
              ]}
            />
          }
        >
          {!accountId ? (
            <div className="container__body sign-in-gate">
              <p>Sign in to submit a proposal.</p>
              <Link to={signInHref(location)} className="app-btn app-btn--primary">
                Sign in
              </Link>
            </div>
          ) : policy && !canSubmit(policy, accountId) ? (
            <div className="container__body">
              <Callout tone="info">This account can't submit proposals.</Callout>
            </div>
          ) : mode === "fund" ? (
            <FundRoundForm bond={bond} />
          ) : mode === "milestone" ? (
            <MilestoneForm bond={bond} initialRound={settledParam ? settledParam.id : null} />
          ) : (
            <ReturnForm bond={bond} />
          )}
        </Container>
      </div>
    </div>
  );
}
