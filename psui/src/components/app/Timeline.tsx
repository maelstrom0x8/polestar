import { Check, X } from "lucide-react";
import type { ReactNode } from "react";

export type StepState = "done" | "current" | "working" | "upcoming" | "failed" | "skipped";

export interface TimelineStep {
  key: string;
  title: ReactNode;
  state: StepState;
  detail?: ReactNode;
}

const STATE_LABEL: Record<StepState, string> = {
  done: "done",
  current: "current",
  working: "in progress",
  upcoming: "not started",
  failed: "failed",
  skipped: "did not happen",
};

export function Timeline({ steps, label }: { steps: TimelineStep[]; label: string }) {
  return (
    <ol className="timeline" aria-label={label}>
      {steps.map((step) => (
        <li
          key={step.key}
          className={`timeline__step timeline__step--${step.state}`}
          aria-current={step.state === "current" || step.state === "working" ? "step" : undefined}
        >
          <span className="timeline__marker" aria-hidden>
            {step.state === "done" && <Check strokeWidth={3} />}
            {(step.state === "failed" || step.state === "skipped") && <X strokeWidth={3} />}
          </span>
          <div>
            <div className="timeline__title">
              {step.title}
              <span className="visually-hidden"> ({STATE_LABEL[step.state]})</span>
            </div>
            {step.detail && <div className="timeline__detail">{step.detail}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}
