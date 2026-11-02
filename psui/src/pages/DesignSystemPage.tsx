import { useState, type ReactNode } from "react";
import { RevealCard } from "../components/RevealCard";
import { RoundCard } from "../components/rounds/RoundCard";
import { PhaseBadge } from "../components/rounds/PhaseBadge";
import { ProjectList } from "../components/projects/ProjectList";
import { Field } from "../components/ui/Field";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Checkbox } from "../components/ui/Checkbox";
import { LandingNav } from "../components/layout/LandingNav";
import { LandingFooter } from "../components/layout/LandingFooter";
import { ROUNDS } from "../data/mock";
import type { RoundPhase } from "../types/domain";

const SWATCHES = [
  { name: "Electric", token: "--electric", textToken: "--text-on-electric" },
  { name: "Signal", token: "--signal", textToken: "--text-on-signal" },
  { name: "Signal Deep", token: "--signal-deep", textToken: "--text-on-signal" },
  { name: "Mist", token: "--mist", textToken: "--text-on-mist" },
  { name: "Ink", token: "--ink", textToken: "--text-on-signal" },
];

const EXAMPLES = [
  {
    index: "P01",
    title: "Shared budgets",
    body: "SputnikDAO votes to fund a round; the community decides how it's split.",
  },
  {
    index: "P02",
    title: "Proportional allocation",
    body: "The Method of Equal Shares funds projects in proportion to actual support.",
  },
  {
    index: "P03",
    title: "Milestone release",
    body: "Funded projects are paid in tranches, each gated by a SputnikDAO vote.",
  },
];

const ALL_PHASES: RoundPhase[] = ["Registration", "Declaration", "Allocation", "Settlement"];

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 64 }}>
      <span className="label">{label}</span>
      <div style={{ marginTop: 16 }}>{children}</div>
    </section>
  );
}

export function DesignSystemPage() {
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const settlementRound = ROUNDS.find((r) => r.phase === "Settlement")!;
  const declarationRound = ROUNDS.find((r) => r.phase === "Declaration")!;

  function toggle(id: string) {
    setApproved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="page">
      <Section label="Palette">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
          }}
        >
          {SWATCHES.map((s) => (
            <div
              key={s.name}
              style={{
                background: `var(${s.token})`,
                color: `var(${s.textToken})`,
                borderRadius: "var(--radius-md)",
                padding: "20px 16px",
                minHeight: 96,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                border: "1px solid var(--border)",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: "var(--text-small)" }}>{s.name}</span>
              <span style={{ fontSize: "var(--text-label)", opacity: 0.75 }}>{s.token}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section label="Type scale">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="h1">Heading One</span>
          <span className="h2">Heading Two</span>
          <span className="h3">Heading Three</span>
          <span style={{ fontSize: "var(--text-body)" }}>
            Body text at var(--text-body), Titillium Web Regular.
          </span>
          <span className="label">Micro label / caption</span>
        </div>
      </Section>

      <Section label="Buttons & badges">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className="btn btn-primary">
            Fund a round
          </button>
          <button type="button" className="btn btn-secondary">
            View proposals
          </button>
          <button type="button" className="btn btn-secondary" disabled>
            Connect Wallet
          </button>
          <span className="badge badge-electric">Open</span>
          <span className="badge badge-signal">Funded</span>
        </div>
      </Section>

      <Section label="Phase badges">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {ALL_PHASES.map((phase) => (
            <PhaseBadge key={phase} phase={phase} />
          ))}
        </div>
      </Section>

      <Section label="Reveal cards">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {EXAMPLES.map((example) => (
            <RevealCard key={example.index} {...example} />
          ))}
        </div>
      </Section>

      <Section label="Round cards">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {ROUNDS.map((round) => (
            <RoundCard key={round.id} round={round} />
          ))}
        </div>
      </Section>

      <Section label="Project rows — read-only (funded/unfunded status)">
        <ProjectList projects={settlementRound.projects} />
      </Section>

      <Section label="Project rows — with approval checkbox">
        <ProjectList
          projects={declarationRound.projects}
          showApproval
          approved={approved}
          onToggle={toggle}
        />
      </Section>

      <Section label="Form primitives">
        <div className="card" style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: 20 }}>
          <Field label="Title" htmlFor="ds-input">
            <Input id="ds-input" placeholder="Project title" />
          </Field>
          <Field label="Summary" htmlFor="ds-textarea" hint="One or two sentences.">
            <Textarea id="ds-textarea" rows={3} placeholder="What is this project?" />
          </Field>
          <Field
            label="Cost (NEAR)"
            htmlFor="ds-input-error"
            error="Milestones sum to 40 NEAR, cost is 100 NEAR."
          >
            <Input id="ds-input-error" defaultValue="100" />
          </Field>
          <Checkbox id="ds-checkbox" checked={approved.size > 0} onChange={() => undefined} label="Approve this project" />
        </div>
      </Section>

      <Section label="Landing chrome — glass nav and footer (landing route only)">
        <p className="project-row__summary" style={{ marginBottom: 20 }}>
          Fixed/sticky positioning is neutralized below (a CSS transform anchors them to this
          box instead of the viewport) purely so they preview in place; on the actual landing
          page they're fixed-to-viewport and sticky-to-scroll respectively.
        </p>
        <div
          style={{
            transform: "scale(1)",
            position: "relative",
            background: "var(--ink)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            paddingTop: 100,
          }}
        >
          <LandingNav />
          <LandingFooter />
        </div>
      </Section>
    </div>
  );
}
