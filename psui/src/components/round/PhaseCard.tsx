import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { AllocationRunner } from "../../lib/allocationRunner";
import { describeBlock, type ChainClock } from "../../lib/chainClock";
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
  return [
    {
      key: "Registration",
      title: "Registration",
      state: state(0),
      detail:
        current === 0
          ? round.projectCount === 0
            ? "Projects can be proposed. Declaration can open once there's at least one."
            : `${round.projectCount} ${round.projectCount === 1 ? "project" : "projects"} proposed so far.`
          : undefined,
    },
    {
      key: "Declaration",
      title: "Declaration",
      state: state(1),
      detail:
        current === 1
          ? ended
            ? `Ended at ${describeBlock(round.config.closesAt, clock)}. Anyone can close it now.`
            : `Supporters declare until ${describeBlock(round.config.closesAt, clock)}.`
          : current < 1
            ? `Runs until ${describeBlock(round.config.closesAt, clock)}.`
            : undefined,
    },
    {
      key: "Allocation",
      title: "Allocation",
      state: state(2),
      detail: current === 2 ? "The budget is split one step at a time. Anyone can advance it." : undefined,
    },
    {
      key: "Settlement",
      title: "Settlement",
      state: round.phase === "Settlement" ? "done" : "upcoming",
      detail:
        current === 3 ? "Funded teams are paid as the DAO confirms each milestone." : undefined,
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
              detail: runner.running.mode === "all" ? "Each step is its own transaction." : undefined,
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
            : "You're advancing the allocation by one step."}
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
      {runner.notice && (
        <Callout tone={runner.notice.tone} title={runner.notice.title} technical={runner.notice.technical}>
          {runner.notice.text}
        </Callout>
      )}
      <button type="button" className="app-btn app-btn--primary app-btn--block" onClick={() => setReviewing("one")}>
        Advance allocation
      </button>
      <button type="button" className="app-btn app-btn--secondary app-btn--block" onClick={() => setReviewing("all")}>
        Advance to completion
      </button>
      <p className="phase-card__caption">Each step is its own transaction.</p>
    </div>
  );
}

function TransitionAction({
  round,
  method,
  label,
  disabledReason,
  summary,
}: {
  round: Round;
  method: "open_declaration" | "close_declaration";
  label: string;
  disabledReason: string | null;
  summary: string;
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
          renderDone={() => <p>Round {round.id} has moved on. The page shows its new state.</p>}
        />
      </div>
    );
  }

  return (
    <div className="phase-card__action">
      <button
        type="button"
        className="app-btn app-btn--primary app-btn--block"
        disabled={disabledReason !== null}
        onClick={() => setReviewing(true)}
      >
        {label}
      </button>
      {disabledReason && <p className="phase-card__caption">{disabledReason}</p>}
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
        <h2 className="container__title">Round progress</h2>
      </div>
      <div className="container__body">
        <Timeline label="Round phases" steps={steps(round, clock)} />
      </div>
      {round.phase === "Registration" && (
        <TransitionAction
          round={round}
          method="open_declaration"
          label="Open declaration"
          disabledReason={round.projectCount === 0 ? "Needs at least one registered project." : null}
          summary={`You're closing registration for Round ${round.id} and opening it to supporters. Anyone can do this once a project is registered.`}
        />
      )}
      {round.phase === "Declaration" && (
        <TransitionAction
          round={round}
          method="close_declaration"
          label="Close declaration"
          disabledReason={
            clock && !ended ? `Available after ${describeBlock(round.config.closesAt, clock)}.` : null
          }
          summary={`You're closing declaration for Round ${round.id} so its budget can be allocated. Anyone can do this once the closing block has passed.`}
        />
      )}
      {round.phase === "Allocation" && runner && <AllocationActions runner={runner} roundId={round.id} />}
    </section>
  );
}
