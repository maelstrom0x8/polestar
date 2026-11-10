import { useState } from "react";
import { relativeTime, type ChainClock } from "../../lib/chainClock";
import { useRefreshRound } from "../../lib/roundData";
import { TGAS } from "../../lib/tx";
import type { Round } from "../../types/domain";
import { Callout } from "../app/Callout";
import { TxFlow } from "../app/TxFlow";

/**
 * The contract only accepts a ballot from an account first seen at or
 * before (opens_at - t_min). There's no view of an account's first-seen
 * block, so this states the deadline rather than a verdict.
 */
export function EligibilityNotice({ round, clock }: { round: Round; clock: ChainClock | undefined }) {
  const [registering, setRegistering] = useState(false);
  const refresh = useRefreshRound(round.id);
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
      Register as a voter {when ? `before registration closes ${when}` : "before voter registration closes"}. If you've
      registered before, or proposed a project, you're already set.
    </Callout>
  ) : (
    <Callout tone="info" title="Voter registration has closed">
      Only accounts that registered as voters before it closed{when ? ` (${when})` : ""} can vote in this round.
    </Callout>
  );
}
