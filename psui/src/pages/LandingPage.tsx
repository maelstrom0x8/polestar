import { CheckCircle2, FilePlus, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { LandingBackdrop } from "../components/LandingBackdrop";
import { LandingFooter } from "../components/layout/LandingFooter";
import { Nav } from "../components/layout/Nav";

const HEADLINE = "A DAO's treasury, split fairly by the community it funds.";
const SUBHEAD =
  "Community members back the projects they want to see funded. Polestar turns that support into a budget allocation, and pays funded teams in stages as the DAO confirms their progress.";

const STEPS = [
  {
    Icon: FilePlus,
    title: "Propose a project",
    body: "Submit a funding proposal with a clear budget and a plan to deliver it.",
  },
  {
    Icon: Users,
    title: "Community support",
    body: "Members back the projects they want to see funded.",
  },
  {
    Icon: CheckCircle2,
    title: "Paid as you deliver",
    body: "Funded teams are paid in stages, released as the DAO confirms progress.",
  },
];

export function LandingPage() {
  return (
    <div className="landing">
      <Nav />
      <div className="landing__hero">
        <LandingBackdrop />
        <div className="landing__hero-content">
          <h1 className="display landing__headline">{HEADLINE}</h1>
          <p className="landing__subhead">{SUBHEAD}</p>
          <Link to="/rounds" className="btn btn-primary landing__cta">
            Get started
          </Link>
        </div>
      </div>

      <section className="landing__how" id="how-it-works">
        <h2 className="h2">How it works</h2>
        <div className="landing__steps">
          {STEPS.map((step, index) => (
            <div className="landing__step" key={step.title}>
              <div className="landing__step-icon">
                <step.Icon aria-hidden="true" />
              </div>
              <span className="landing__step-number">{index + 1}</span>
              <h3 className="h3 landing__step-title">{step.title}</h3>
              <p className="landing__step-body">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing__authority">
        <div className="landing__authority-inner">
          <h2 className="h2">The DAO stays in control.</h2>
          <p>
            Community support shapes how a round's budget is shared — it doesn't replace the DAO's own
            decisions. The DAO chooses whether to fund a round, and confirms every milestone before a
            payment goes out.
          </p>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
