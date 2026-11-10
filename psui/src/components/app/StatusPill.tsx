import { Check, CircleDashed, X } from "lucide-react";
import type { ReactNode } from "react";
import { PHASE_LABEL } from "../../lib/phaseCopy";
import type { ProjectStatus, RoundPhase } from "../../types/domain";

type Tone = "neutral" | "signal" | "attention" | "outline" | "muted";

export function Pill({ tone, icon, children }: { tone: Tone; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className={`pill pill--${tone}`}>
      {icon}
      {children}
    </span>
  );
}

const PHASE_TONE: Record<RoundPhase, Tone> = {
  Registration: "neutral",
  Declaration: "signal",
  Allocation: "attention",
  Settlement: "outline",
};

export function PhasePill({ phase }: { phase: RoundPhase }) {
  return <Pill tone={PHASE_TONE[phase]}>{PHASE_LABEL[phase]}</Pill>;
}

export function ProjectStatusPill({ status }: { status: ProjectStatus }) {
  if (status === "Funded") {
    return (
      <Pill tone="signal" icon={<Check aria-hidden />}>
        Funded
      </Pill>
    );
  }
  if (status === "Unfunded") {
    return (
      <Pill tone="muted" icon={<X aria-hidden />}>
        Not funded
      </Pill>
    );
  }
  return (
    <Pill tone="neutral" icon={<CircleDashed aria-hidden />}>
      Pending
    </Pill>
  );
}
