import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, ExternalLink } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { CONTRACT_ID } from "../../lib/near";
import { describeRefusal } from "../../lib/refusals";
import { signInHref } from "../../lib/returnPath";
import {
  TxCancelledError,
  TxNetworkError,
  TxRefusedError,
  contractJson,
  explorerTxUrl,
  sendCall,
  type ContractCall,
  type TxOutcome,
} from "../../lib/tx";
import { useWallet } from "../../lib/wallet";
import { Callout } from "./Callout";
import { PayloadBlock } from "./PayloadBlock";
import { Timeline, type StepState } from "./Timeline";

type Stage = "review" | "signing" | "updating" | "done" | "unknown";

export interface Notice {
  tone: "neutral" | "attention" | "error";
  title: string;
  text?: string;
  technical?: string;
}

export interface TxFlowProps {
  title: string;
  progressTitle: string;
  figure: string;
  figureCaption?: string;
  summary: ReactNode;
  lines?: { label: string; value: ReactNode }[];
  call: ContractCall;
  onBack?: () => void;
  /** Runs once the chain has confirmed: refetch what changed, record history. */
  onConfirmed: (outcome: TxOutcome) => Promise<void> | void;
  renderDone: (outcome: TxOutcome) => ReactNode;
  /** Where to look before retrying if the outcome is unknown. */
  unknownHint?: string;
}

export function noticeFor(error: unknown): Notice {
  if (error instanceof TxCancelledError) return { tone: "neutral", title: "Signing was cancelled." };
  if (error instanceof TxRefusedError) {
    const { text, anomaly } = describeRefusal(error.code);
    return {
      tone: anomaly ? "error" : "attention",
      title: anomaly ? "Something unexpected happened" : "The contract didn't accept this",
      text,
      technical: error.code,
    };
  }
  if (error instanceof TxNetworkError) {
    return { tone: "error", title: "Couldn't reach your wallet", text: `Nothing was sent. ${error.message}` };
  }
  return { tone: "error", title: "Something went wrong", text: error instanceof Error ? error.message : String(error) };
}

export function TxFlow(props: TxFlowProps) {
  const { title, progressTitle, figure, figureCaption, summary, lines, call, onBack, onConfirmed, renderDone, unknownHint } =
    props;
  const { accountId } = useWallet();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<Stage>("review");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [outcome, setOutcome] = useState<TxOutcome | null>(null);

  async function confirm() {
    setNotice(null);
    setStage("signing");
    let result: TxOutcome;
    try {
      result = await sendCall(call);
    } catch (error) {
      if (error instanceof TxCancelledError || error instanceof TxRefusedError || error instanceof TxNetworkError) {
        setNotice(noticeFor(error));
        setStage("review");
      } else {
        setNotice(noticeFor(error));
        setStage("unknown");
      }
      return;
    }
    setOutcome(result);
    setStage("updating");
    try {
      await onConfirmed(result);
    } finally {
      setStage("done");
    }
  }

  if (stage === "review") {
    const payload = contractJson(
      { receiver_id: CONTRACT_ID, method_name: call.method, args: call.args, deposit: call.deposit, gas: call.gas },
      2,
    );
    return (
      <div className="tx">
        <div className="tx__head">
          {onBack && (
            <button type="button" className="tx__back" onClick={onBack} aria-label="Back to the form">
              <ArrowLeft aria-hidden />
            </button>
          )}
          <h3 className="tx__title">{title}</h3>
        </div>
        <div className="tx__figure">
          <span className="tx__figure-value">{figure}</span>
          {figureCaption && <span className="tx__figure-caption">{figureCaption}</span>}
        </div>
        <p className="tx__summary">{summary}</p>
        {lines && lines.length > 0 && (
          <dl className="tx__lines">
            {lines.map((line) => (
              <div key={line.label} className="tx__line">
                <dt>{line.label}</dt>
                <dd>{line.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <details className="tx__sign">
          <summary>What you'll sign</summary>
          <PayloadBlock value={payload} label="Transaction details" />
        </details>
        {notice && (
          <Callout
            tone={notice.tone}
            title={notice.title}
            technical={notice.technical}
            role={notice.tone === "neutral" ? "status" : "alert"}
            action={
              notice.technical === "ERR_WRONG_PHASE" ? (
                <button type="button" className="app-btn app-btn--secondary" onClick={() => void queryClient.invalidateQueries()}>
                  Refresh the round
                </button>
              ) : undefined
            }
          >
            {notice.text}
          </Callout>
        )}
        <div className="tx__actions">
          {onBack && (
            <button type="button" className="app-btn app-btn--secondary" onClick={onBack}>
              Back
            </button>
          )}
          {accountId ? (
            <button type="button" className="app-btn app-btn--primary" onClick={confirm}>
              {notice?.tone === "error" ? "Try again" : "Confirm in wallet"}
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

  if (stage === "done" && outcome) {
    return (
      <div className="tx tx--done" role="status">
        <div className="tx__done-head">
          <CheckCircle2 aria-hidden />
          <h3 className="tx__title">Done</h3>
        </div>
        {renderDone(outcome)}
        {outcome.hash && !outcome.hash.startsWith("mock-") && (
          <a className="app-link tx__explorer" href={explorerTxUrl(outcome.hash)} target="_blank" rel="noreferrer">
            View transaction <ExternalLink aria-hidden size={14} />
          </a>
        )}
      </div>
    );
  }

  const walletState: StepState = stage === "signing" ? "working" : stage === "unknown" ? "failed" : "done";
  const chainState: StepState = stage === "signing" ? "upcoming" : stage === "unknown" ? "upcoming" : "done";
  const pageState: StepState = stage === "updating" ? "working" : "upcoming";

  return (
    <div className="tx" aria-live="polite">
      <h3 className="tx__title">{progressTitle}</h3>
      <Timeline
        label="Transaction progress"
        steps={[
          {
            key: "wallet",
            title: stage === "unknown" ? "No answer from your wallet" : "Confirm in your wallet",
            state: walletState,
            detail: stage === "signing" ? "Your wallet shows exactly what's being sent." : undefined,
          },
          {
            key: "chain",
            title: "Sent and confirmed on chain",
            state: chainState,
            detail: outcome?.hash ? <span className="mono">{outcome.hash}</span> : undefined,
          },
          { key: "page", title: "Page updated", state: pageState },
        ]}
      />
      {stage === "unknown" && notice && (
        <Callout
          tone="error"
          role="alert"
          title="We couldn't confirm whether this went through"
          action={
            <button type="button" className="app-btn app-btn--secondary" onClick={() => setStage("review")}>
              I've checked, back to review
            </button>
          }
        >
          {`Check your wallet's recent activity${unknownHint ? ` and ${unknownHint}` : ""} before trying again, so nothing is sent twice. (${notice.text})`}
        </Callout>
      )}
    </div>
  );
}
