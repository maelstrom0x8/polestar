import { Plus, SearchX, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Callout } from "../components/app/Callout";
import { Container } from "../components/app/Container";
import { TextAreaField, TextField } from "../components/app/Form";
import { PageHeader } from "../components/app/PageHeader";
import { TxFlow } from "../components/app/TxFlow";
import { EmptyState } from "../components/EmptyState";
import { isValidAccountId } from "../lib/accountId";
import { recordActivity } from "../lib/activity";
import { useRound } from "../lib/contractQueries";
import { formatNear, parseNear } from "../lib/format";
import { viewFunction } from "../lib/near";
import { useRefreshRound } from "../lib/roundData";
import { TGAS, type TxOutcome } from "../lib/tx";
import { useWallet } from "../lib/wallet";

const MAX_TITLE_BYTES = 200;
const MAX_SUMMARY_BYTES = 2000;
const utf8 = (s: string) => new TextEncoder().encode(s).length;

interface Draft {
  title: string;
  summary: string;
  recipient: string;
  milestones: string[];
  deposit: string;
}

interface Checked {
  cost: bigint;
  amounts: bigint[];
  deposit: bigint;
}

function validate(draft: Draft): { errors: Partial<Record<string, string>>; checked: Checked | null } {
  const errors: Partial<Record<string, string>> = {};
  if (!draft.title.trim()) errors.title = "Give the project a title.";
  else if (utf8(draft.title) > MAX_TITLE_BYTES) errors.title = "That's longer than the contract allows.";
  if (!draft.summary.trim()) errors.summary = "Describe what the funding will deliver.";
  else if (utf8(draft.summary) > MAX_SUMMARY_BYTES) errors.summary = "That's longer than the contract allows.";
  if (!isValidAccountId(draft.recipient.trim())) errors.recipient = "Enter a valid NEAR account, like name.testnet.";

  const amounts = draft.milestones.map(parseNear);
  draft.milestones.forEach((text, i) => {
    const amount = amounts[i];
    if (amount === null || amount === 0n) errors[`m${i}`] = text.trim() ? "Enter an amount above zero." : "Enter an amount.";
  });
  const deposit = parseNear(draft.deposit);
  if (deposit === null || deposit === 0n) errors.deposit = "The contract needs a deposit above zero.";

  const valid = Object.keys(errors).length === 0;
  const exact = amounts.filter((a): a is bigint => a !== null);
  return {
    errors,
    checked: valid ? { cost: exact.reduce((sum, a) => sum + a, 0n), amounts: exact, deposit: deposit as bigint } : null,
  };
}

interface RegisteredProjectRaw {
  cost: string | number;
  milestones: { amount: string | number }[];
}

export function RegisterProjectPage() {
  const { roundId = "" } = useParams();
  const validId = /^\d+$/.test(roundId) ? roundId : undefined;
  const roundQuery = useRound(validId);
  const { accountId } = useWallet();
  const refresh = useRefreshRound(roundId);
  const [draft, setDraft] = useState<Draft>({ title: "", summary: "", recipient: "", milestones: [""], deposit: "0.1" });
  const [submitted, setSubmitted] = useState(false);
  const [review, setReview] = useState<Checked | null>(null);
  const [mismatch, setMismatch] = useState(false);

  const recipient = draft.recipient || accountId || "";
  const { errors, checked } = validate({ ...draft, recipient });
  const show = (key: string) => (submitted ? errors[key] : null);
  const running = draft.milestones.map(parseNear).reduce<bigint>((sum, a) => sum + (a ?? 0n), 0n);

  const crumbs = [
    { label: "Rounds", to: "/rounds" },
    { label: `Round ${roundId}`, to: `/rounds/${roundId}` },
    { label: "Register a project" },
  ];

  if (!validId || roundQuery.data === null) {
    return (
      <div className="page">
        <PageHeader crumbs={crumbs} title="Register a project" />
        <Container>
          <EmptyState Icon={SearchX} message={`There's no round ${roundId}.`} action={{ label: "See all rounds", to: "/rounds" }} />
        </Container>
      </div>
    );
  }

  const round = roundQuery.data;
  if (round && round.phase !== "Registration") {
    return (
      <div className="page">
        <PageHeader crumbs={crumbs} title="Register a project" />
        <Callout tone="info" title={`Registration has closed for Round ${round.id}`}>
          This round is in {round.phase.toLowerCase()} now, so it no longer takes new projects.{" "}
          <Link to={`/rounds/${round.id}`} className="app-link">
            Back to the round
          </Link>
        </Callout>
      </div>
    );
  }

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (checked) setReview(checked);
  }

  async function verify(outcome: TxOutcome, expected: Checked) {
    const projectId = String(outcome.value);
    if (accountId) {
      recordActivity(accountId, { kind: "project", roundId, projectId, title: draft.title.trim(), at: Date.now() });
    }
    await refresh();
    // Re-read what the contract stored and compare it with what was entered.
    const stored = await viewFunction<RegisteredProjectRaw | null>("get_project", {
      round_id: Number(roundId),
      project_id: Number(projectId),
    }).catch(() => null);
    if (
      stored &&
      (BigInt(stored.cost) !== expected.cost ||
        stored.milestones.length !== expected.amounts.length ||
        stored.milestones.some((m, i) => BigInt(m.amount) !== expected.amounts[i]))
    ) {
      setMismatch(true);
    }
  }

  return (
    <div className="page">
      <PageHeader crumbs={crumbs} title="Register a project" subtitle={`for Round ${roundId}`} />
      <div className="narrow">
        {review ? (
          <Container>
            <div className="container__body">
              <TxFlow
                title="Review your project"
                progressTitle="Registering your project"
                figure={formatNear(review.deposit, true)}
                figureCaption="Registration deposit, not returned · network fee shown by your wallet"
                summary={
                  <>
                    You're registering <strong>{draft.title.trim()}</strong> in Round {roundId}, asking{" "}
                    {formatNear(review.cost, true)} across {review.amounts.length}{" "}
                    {review.amounts.length === 1 ? "milestone" : "milestones"}. Nothing can be edited after registration.
                  </>
                }
                lines={[
                  { label: "Paid to", value: recipient },
                  ...review.amounts.map((amount, i) => ({ label: `Milestone ${i + 1}`, value: formatNear(amount, true) })),
                  { label: "Total cost", value: formatNear(review.cost, true) },
                ]}
                call={{
                  method: "register_project",
                  args: {
                    round_id: Number(roundId),
                    recipient: recipient.trim(),
                    title: draft.title.trim(),
                    summary: draft.summary.trim(),
                    cost: review.cost,
                    milestone_amounts: review.amounts,
                  },
                  deposit: review.deposit,
                  gas: 100n * TGAS,
                }}
                onBack={() => setReview(null)}
                onConfirmed={(outcome) => verify(outcome, review)}
                unknownHint="this round's project list"
                renderDone={(outcome) => (
                  <>
                    <p>
                      Registered as project #{String(outcome.value)} in Round {roundId}.
                    </p>
                    {mismatch ? (
                      <Callout tone="error" role="alert" title="The stored amounts don't match what you entered">
                        Check the project page before sharing it.
                      </Callout>
                    ) : (
                      <p className="muted" style={{ fontSize: "var(--app-small)" }}>
                        Amounts checked against what the contract stored.
                      </p>
                    )}
                    <div className="tx__actions" style={{ justifyContent: "flex-start" }}>
                      <Link to={`/rounds/${roundId}/projects/${String(outcome.value)}`} className="app-btn app-btn--primary">
                        View project
                      </Link>
                      <Link to={`/rounds/${roundId}`} className="app-btn app-btn--secondary">
                        Back to the round
                      </Link>
                    </div>
                  </>
                )}
              />
            </div>
          </Container>
        ) : (
          <Container>
            <form className="container__body form" onSubmit={onSubmit} noValidate>
              <TextField
                label="Title"
                value={draft.title}
                onChange={(e) => update("title", e.target.value)}
                counter={`${utf8(draft.title)} / ${MAX_TITLE_BYTES}`}
                error={show("title")}
              />
              <TextAreaField
                label="Summary"
                value={draft.summary}
                onChange={(e) => update("summary", e.target.value)}
                counter={`${utf8(draft.summary)} / ${MAX_SUMMARY_BYTES}`}
                hint="What will this funding deliver, and how will the DAO know each milestone is done?"
                error={show("summary")}
              />
              <TextField
                label="Paid to"
                value={recipient}
                onChange={(e) => update("recipient", e.target.value)}
                hint="The account that receives each milestone payment. Defaults to yours."
                error={show("recipient")}
                autoComplete="off"
                spellCheck={false}
              />

              <fieldset className="form-field" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="form-field__label" style={{ marginBottom: 6 }}>
                  Milestones
                </legend>
                <p className="form-field__hint" style={{ marginBottom: 10 }}>
                  The project is paid in these stages, each released when the DAO confirms it. They add up to the
                  project's cost and can't be changed later.
                </p>
                <div className="milestones">
                  {draft.milestones.map((value, i) => (
                    <div className="milestone-row" key={i}>
                      <span className="milestone-row__index">{i + 1}</span>
                      <TextField
                        label={`Milestone ${i + 1} amount`}
                        value={value}
                        inputMode="decimal"
                        placeholder="0.00"
                        suffix="NEAR"
                        onChange={(e) =>
                          update(
                            "milestones",
                            draft.milestones.map((m, j) => (j === i ? e.target.value : m)),
                          )
                        }
                        error={show(`m${i}`)}
                      />
                      <button
                        type="button"
                        className="milestone-row__remove"
                        aria-label={`Remove milestone ${i + 1}`}
                        disabled={draft.milestones.length === 1}
                        onClick={() => update("milestones", draft.milestones.filter((_, j) => j !== i))}
                      >
                        <X aria-hidden size={18} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="app-btn app-btn--ghost"
                  style={{ alignSelf: "flex-start", marginTop: 8 }}
                  onClick={() => update("milestones", [...draft.milestones, ""])}
                >
                  <Plus aria-hidden /> Add a milestone
                </button>
              </fieldset>

              <div className="total-row" aria-live="polite">
                <span className="form-field__label">Total cost</span>
                <span className="total-row__value">{formatNear(running, true)}</span>
              </div>

              <TextField
                label="Registration deposit"
                value={draft.deposit}
                inputMode="decimal"
                suffix="NEAR"
                onChange={(e) => update("deposit", e.target.value)}
                hint="Discourages spam. The contract keeps it; it isn't returned."
                error={show("deposit")}
              />

              <div className="form-actions">
                <Link to={`/rounds/${roundId}`} className="app-btn app-btn--secondary">
                  Cancel
                </Link>
                <button type="submit" className="app-btn app-btn--primary">
                  Review
                </button>
              </div>
            </form>
          </Container>
        )}
      </div>
    </div>
  );
}
