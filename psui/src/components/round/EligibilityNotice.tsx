import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { relativeTime, type ChainClock } from "../../lib/chainClock";
import type { VoterStatus } from "../../lib/eligibility";
import { useRefreshRound } from "../../lib/roundData";
import { TGAS } from "../../lib/tx";
import type { Round } from "../../types/domain";
import { Callout } from "../app/Callout";
import { TxFlow } from "../app/TxFlow";

/**
 * Voting needs an account first seen by (opens_at - t_min). With `status`
 * (the account's first-seen block was readable) this gives a verdict;
 * without it (signed out, or a deployment without that view) it states
 * the deadline instead.
 */
export function EligibilityNotice({
  round,
  clock,
  status,
}: {
  round: Round;
  clock: ChainClock | undefined;
  status: VoterStatus | null;
}) {
  const [registering, setRegistering] = useState(false);
  const refreshRound = useRefreshRound(round.id);
  const queryClient = useQueryClient();
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["firstSeen"] });
    await refreshRound();
  };
  const deadline = round.config.opensAt - round.config.tMin;
  const open = clock ? clock.height <= deadline : true;

  if (registering) {
    return (
      <section className="container">
        <div className="container__body">
          <TxFlow
            title="Register as a voter"
            progressTitle="Registering you as a voter"
            figure="No deposit"
            figureCaption="Network fee shown by your wallet"
            summary="You're registering this account as a voter. It's a one-time step, and it lets you vote in this round and later ones."
            call={{ method: "register_voter", args: {}, deposit: 0n, gas: 30n * TGAS }}
            onBack={() => setRegistering(false)}
            onConfirmed={refresh}
            renderDone={() => (
              <p>
                You're registered. You can vote in this round once voting starts.{" "}
                <button type="button" className="app-btn app-btn--ghost" onClick={() => setRegistering(false)}>
                  Close
                </button>
              </p>
            )}
          />
        </div>
      </section>
    );
  }

  const when = relativeTime(deadline, clock);

  if (status === "not-member") {
    return (
      <Callout tone="info" title="You can't vote in this round">
        Voting in this round is open to members of {round.voterNamespace}, meaning accounts named like
        yourname.{round.voterNamespace}. You can still follow the results.
      </Callout>
    );
  }

  if (round.phase === "Declaration") {
    return status === "too-late" || status === "not-registered" ? (
      <Callout tone="info" title="You can't vote in this round">
        This account wasn't registered as a voter before this round's deadline. You can still follow the results.
      </Callout>
    ) : null;
  }

  if (status === "eligible") {
    return <Callout tone="info">You're registered. You can vote in this round once voting starts.</Callout>;
  }
  if (status === "too-late") {
    return (
      <Callout tone="info" title="You can't vote in this round">
        This account registered as a voter after this round's deadline. It can vote in later rounds.
      </Callout>
    );
  }

  return open ? (
    <Callout
      tone="attention"
      title="Want to vote in this round?"
      action={
        <button type="button" className="app-btn app-btn--secondary" onClick={() => setRegistering(true)}>
          Register as a voter
        </button>
      }
    >
      Register as a voter {when ? `before registration closes ${when}` : "before voter registration closes"}.
      {status === null ? " If you've registered before, or proposed a project, you're already set." : ""}
    </Callout>
  ) : (
    <Callout tone="info" title="Voter registration has closed">
      Only accounts that registered as voters before it closed{when ? ` (${when})` : ""} can vote in this round.
    </Callout>
  );
}
