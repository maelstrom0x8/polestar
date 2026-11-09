import { useState } from "react";
import { describeBlock, type ChainClock } from "../../lib/chainClock";
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
            summary="You're recording this account with Polestar so it can support projects in rounds that open later. It's a one-time step."
            call={{ method: "register_voter", args: {}, deposit: 0n, gas: 30n * TGAS }}
            onBack={() => setRegistering(false)}
            onConfirmed={refresh}
            renderDone={() => (
              <p>
                You're registered. You can support projects in this round once declaration opens.{" "}
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

  return open ? (
    <Callout
      tone="attention"
      title="Want to support projects in this round?"
      action={
        <button type="button" className="app-btn app-btn--secondary" onClick={() => setRegistering(true)}>
          Register as a voter
        </button>
      }
    >
      An account has to be registered as a voter by {describeBlock(deadline, clock)}. If this account has used Polestar
      before (registered as a voter or proposed a project), it's already registered.
    </Callout>
  ) : (
    <Callout tone="info" title="Who can support projects here">
      Only accounts registered with Polestar by {describeBlock(deadline, clock)} can support projects in this round.
    </Callout>
  );
}
