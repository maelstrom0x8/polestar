import { RevealCard } from "../components/RevealCard";

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

export function DesignSystemPage() {
  return (
    <div className="page">
      <section style={{ marginBottom: 64 }}>
        <span className="label">Palette</span>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
            marginTop: 16,
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
      </section>

      <section style={{ marginBottom: 64 }}>
        <span className="label">Type scale</span>
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="h1">Heading One</span>
          <span className="h2">Heading Two</span>
          <span className="h3">Heading Three</span>
          <span style={{ fontSize: "var(--text-body)" }}>
            Body text at 1rem, Titillium Web Regular.
          </span>
          <span className="label">Micro label / caption</span>
        </div>
      </section>

      <section style={{ marginBottom: 64 }}>
        <span className="label">Components</span>
        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <button type="button" className="btn btn-primary">
            Fund a round
          </button>
          <button type="button" className="btn btn-secondary">
            View proposals
          </button>
          <span className="badge badge-electric">Open</span>
          <span className="badge badge-signal">Funded</span>
        </div>
      </section>

      <section>
        <span className="label">Reveal cards</span>
        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {EXAMPLES.map((example) => (
            <RevealCard key={example.index} {...example} />
          ))}
        </div>
      </section>
    </div>
  );
}
