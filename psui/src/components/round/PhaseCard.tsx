import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { AllocationRunner } from "../../lib/allocationRunner";
import { relativeTime, type ChainClock } from "../../lib/chainClock";
import { PHASE_LABEL } from "../../lib/phaseCopy";
import { CONTRACT_ID } from "../../lib/near";
import { signInHref } from "../../lib/returnPath";
import { useRefreshRound } from "../../lib/roundData";
import { TGAS, contractJson } from "../../lib/tx";
import { useWallet } from "../../lib/wallet";
import type { Round, RoundPhase } from "../../types/domain";
import { Callout } from "../app/Callout";
import { PayloadBlock } from "../app/PayloadBlock";
import { Timeline, type StepState, type TimelineStep } from "../app/Timeline";
import { TxFlow } from "../app/TxFlow";

const ORDER: RoundPhase[] = ["Registration", "Declaration", "Allocation", "Settlement"];

function steps(round: Round, clock: ChainClock | undefined): TimelineStep[] {
  const current = ORDER.indexOf(round.phase);
  const state = (i: number): StepState => (i < current ? "done" : i === current ? "current" : "upcoming");
  const ended = clock !== undefined && clock.height > round.config.closesAt;
  const closes = relativeTime(round.config.closesAt, clock);
  return [
    {
      key: "Registration",
      title: PHASE_LABEL.Registration,
      state: state(0),
      detail: current === 0 && round.projectCount === 0 ? "No proposals yet." : undefined,
    },
    {
      key: "Declaration",
      title: PHASE_LABEL.Declaration,
      state: state(1),
      detail:
        current === 1
          ? ended
            ? "Voting has ended."
            : closes
              ? `Closes ${closes}.`
              : undefined
          : undefined,
    },
    {
      key: "Allocation",
      title: PHASE_LABEL.Allocation,
      state: state(2),
      detail: current === 2 ? "The budget is being shared out, one project at a time." : undefined,
    },
    {
      key: "Settlement",
      title: PHASE_LABEL.Settlement,
      state: round.phase === "Settlement" ? "done" : "upcoming",
      detail: current === 3 ? "Funded projects are paid milestone by milestone." : undefined,
    },
  ];
}

function AllocationActions({ runner, roundId }: { runner: AllocationRunner; roundId: string }) {
  const { accountId } = useWallet();
  const location = useLocation();
  const [reviewing, setReviewing] = useState<null | "one" | "all">(null);

  if (runner.running) {
    return (
      <div className="phase-card__action">
        <Timeline
          label="Allocation progress"
          steps={[
            {
              key: "step",
              title: `Step ${runner.running.step}: confirm in your wallet`,
              state: "working",
              detail: runner.running.mode === "all" ? "Each step needs its own confirmation." : undefined,
            },
          ]}
        />
        {runner.running.mode === "all" && (
          <button type="button" className="app-btn app-btn--secondary app-btn--block" onClick={runner.stop}>
            Stop after this step
          </button>
        )}
      </div>
    );
  }

  if (reviewing) {
    const payload = contractJson(
      {
        receiver_id: CONTRACT_ID,
        method_name: "process_allocation_step",
        args: { round_id: Number(roundId) },
        deposit: 0n,
        gas: 300n * TGAS,
      },
      2,
    );
    return (
      <div className="phase-card__action">
        <p className="phase-card__review">
          <strong>No deposit.</strong>{" "}
          {reviewing === "all"
            ? "Your wallet will ask you to confirm each step. You can stop between steps."
            : "You're running one step of the count."}
        </p>
        <details className="tx__sign">
          <summary>What you'll sign</summary>
          <PayloadBlock value={payload} label="Transaction details" />
        </details>
        <div className="tx__actions">
          <button type="button" className="app-btn app-btn--secondary" onClick={() => setReviewing(null)}>
            Back
          </button>
          {accountId ? (
            <button
              type="button"
              className="app-btn app-btn--primary"
              onClick={() => {
                const mode = reviewing;
                setReviewing(null);
                void (mode === "all" ? runner.advanceAll() : runner.advanceOne());
              }}
            >
              Confirm in wallet
            </button>
          ) : (
            <Link to={signInHref(location)} className="app-btn app-btn--primary">
              Sign in to continue
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="phase-card__action">
      <div className="section-label">Keep this round moving</div>
      {runner.notice && (
        <Callout tone={runner.notice.tone} title={runner.notice.title} technical={runner.notice.technical}>
          {runner.notice.text}
        </Callout>
      )}
      <p className="phase-card__caption">
        Counting happens one step at a time, and anyone can run it. Each step is a separate confirmation in your wallet.
      </p>
      <button type="button" className="app-btn app-btn--secondary app-btn--block" onClick={() => setReviewing("all")}>
        Finish counting
      </button>
      <button type="button" className="app-btn app-btn--ghost" onClick={() => setReviewing("one")}>
        Count one step
      </button>
    </div>
  );
}

function TransitionAction({
  round,
  method,
  label,
  summary,
  caption,
}: {
  round: Round;
  method: "open_declaration" | "close_declaration";
  label: string;
  summary: string;
  caption: string;
}) {
  const [reviewing, setReviewing] = useState(false);
  const refresh = useRefreshRound(round.id);

  if (reviewing) {
    return (
      <div className="phase-card__action">
        <TxFlow
          title={label}
          progressTitle={label}
          figure="No deposit"
          figureCaption="Network fee shown by your wallet"
          summary={summary}
          call={{ method, args: { round_id: Number(round.id) }, deposit: 0n, gas: 300n * TGAS }}
          onBack={() => setReviewing(false)}
          onConfirmed={refresh}
          renderDone={() => <p>Done. The page now shows the round's new stage.</p>}
        />
      </div>
    );
  }

  return (
    <div className="phase-card__action">
      <div className="section-label">Keep this round moving</div>
      <p className="phase-card__caption">{caption}</p>
      <button type="button" className="app-btn app-btn--secondary app-btn--block" onClick={() => setReviewing(true)}>
        {label}
      </button>
    </div>
  );
}

interface PhaseCardProps {
  round: Round;
  clock: ChainClock | undefined;
  runner: AllocationRunner | null;
}

export function PhaseCard({ round, clock, runner }: PhaseCardProps) {
  const ended = clock !== undefined && clock.height > round.config.closesAt;
  return (
    <section className="container phase-card">
      <div className="container__header">
        <h2 className="container__title">Where this round is</h2>
      </div>
      <div className="container__body">
        <Timeline label="Round phases" steps={steps(round, clock)} />
      </div>
      {round.phase === "Registration" && round.projectCount > 0 && (
        <TransitionAction
          round={round}
          method="open_declaration"
          label="Start voting"
          caption="Anyone can start voting. It closes this round to new proposals for everyone."
          summary={`You're starting voting in Round ${round.id}. No more projects can be proposed after this.`}
        />
      )}
      {round.phase === "Declaration" && (ended || !clock) && (
        <TransitionAction
          round={round}
          method="close_declaration"
          label="End voting"
          caption="Voting has closed. Anyone can end it so the votes get counted."
          summary={`You're ending voting in Round ${round.id} so the votes can be counted.`}
        />
      )}
      {round.phase === "Allocation" && runner && <AllocationActions runner={runner} roundId={round.id} />}
    </section>
  );
}
