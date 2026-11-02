import { Link } from "react-router-dom";
import { LandingNav } from "../components/layout/LandingNav";
import { LandingFooter } from "../components/layout/LandingFooter";
import { LandingBackdrop } from "../components/LandingBackdrop";
import { RevealCard } from "../components/RevealCard";

const HOW_IT_WORKS = [
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

export function LandingPage() {
  return (
    <div>
      <LandingNav />
      <main className="landing-main" style={{ paddingBottom: 120 }}>
        <section className="landing-hero" style={{ marginBottom: 72, paddingTop: 24, paddingBottom: 24 }}>
          <LandingBackdrop />
          <div className="landing-hero__content">
            <span className="label">Polestar</span>
            <h1 className="display" style={{ marginTop: 8 }}>
              Shared budgets,
              <br />
              allocated fairly.
            </h1>
            <div style={{ marginTop: 28 }}>
              <Link to="/rounds" className="btn btn-primary">
                View rounds
              </Link>
            </div>
          </div>
        </section>

        <section>
          <span className="label">How it works</span>
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {HOW_IT_WORKS.map((item) => (
              <RevealCard key={item.index} {...item} />
            ))}
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
