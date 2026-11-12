import {
  ArrowRight,
  ArrowUpRight,
  Blocks,
  Hammer,
  Landmark,
  UsersRound,
} from "lucide-react";
import { motion } from "motion/react";
import { Link, Navigate } from "react-router-dom";
import { LandingBackdrop } from "../components/LandingBackdrop";
import { CodeCard, CopyButton } from "../components/landing/CodeCard";
import { CtaBand } from "../components/landing/CtaBand";
import { ControlDiagram } from "../components/landing/ControlDiagram";
import { FAQ_TEASER } from "../components/landing/faq";
import { FaqAccordion } from "../components/landing/FaqAccordion";
import { EASE, Reveal, Stagger, StaggerItem } from "../components/landing/Reveal";
import { SplitComparison } from "../components/landing/SplitComparison";
import { Typewriter } from "../components/Typewriter";
import { LINKS } from "../lib/links";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { useWallet } from "../lib/wallet";

const HEADLINE = "A DAO's treasury, split fairly by the community it funds.";
const AUDIENCES = [
  {
    Icon: UsersRound,
    tag: "Communities",
    title: "Back the projects you want",
    body: "Register once, then approve every project you'd like funded. Your equal share of the budget goes only to projects you back.",
    link: { to: "/rounds", label: "Browse rounds" },
  },
  {
    Icon: Hammer,
    tag: "Builders",
    title: "Get funded, get paid as you deliver",
    body: "Propose a project with a budget split into milestones. Win enough backers to cover it, and each milestone is paid when it's done.",
    link: { to: "/propose", label: "Propose a project" },
  },
  {
    Icon: Landmark,
    tag: "DAO councils",
    title: "Keep the final say on every payment",
    body: "Fund a round from your treasury and approve each milestone with your DAO's own proposals. Nothing moves without your vote.",
    link: { to: "/proposals", label: "Open proposals" },
  },
];

const INSTALL = "npm install @ezeonlabs/polestar";

const SNIPPET = `import { PolestarClient, formatNearAmount }
  from "@ezeonlabs/polestar";

const polestar = new PolestarClient({
  contractId: "budgeting.polestar-dev.testnet",
  daoId: "dao.polestar-dev.testnet",
});

const round = await polestar.getRound(0);
const result = await polestar.getAllocationResult(0);
const budget = formatNearAmount(round!.config.budget);
console.log(round?.phase, budget, result);`;

export function LandingPage() {
  const { accountId } = useWallet();
  useDocumentTitle(null);
  if (accountId) return <Navigate to="/rounds" replace />;

  return (
    <div className="landing">
      <section className="landing__hero">
        <LandingBackdrop />
        <div className="landing__hero-content">

          <h1 className="display landing__headline">
            <span className="visually-hidden">{HEADLINE}</span>
            <Typewriter text={HEADLINE} />
          </h1>
          <motion.div
            className="landing__ctas"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.75 }}
          >
            <Link to="/rounds" className="btn btn-primary btn-arrow">
              Get started <ArrowRight aria-hidden size={18} />
            </Link>
            <Link to="/about#equal-shares" className="btn btn-secondary btn-arrow">
              How the split works <ArrowRight aria-hidden size={18} />
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="section" aria-labelledby="fair-title">
        <div className="section__inner">
          <Reveal className="section__head">
            <span className="label">Why equal shares</span>
            <h2 id="fair-title" className="h2">
              Not the council's pick. Not just the biggest group's.
            </h2>
            <p className="section__lead">
              Each member gets an equal share of the budget, and a project is funded when its backers can cover it
              together. Here is the same vote, counted two ways.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <SplitComparison />
          </Reveal>
          <Reveal className="section__foot">
            <Link to="/about#equal-shares" className="text-link">
              How the split works <ArrowRight aria-hidden size={16} />
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="section section--tinted" aria-labelledby="roles-title">
        <div className="section__inner">
          <Reveal className="section__head">
            <span className="label">Built for everyone in the round</span>
            <h2 id="roles-title" className="h2">
              One round, three ways in.
            </h2>
          </Reveal>
          <Stagger className="cards">
            {AUDIENCES.map((audience) => (
              <StaggerItem className="card" key={audience.tag}>
                <span className="card__icon">
                  <audience.Icon aria-hidden size={22} />
                </span>
                <span className="card__tag">{audience.tag}</span>
                <h3 className="card__title">{audience.title}</h3>
                <p className="card__body">{audience.body}</p>
                <Link to={audience.link.to} className="text-link card__link">
                  {audience.link.label} <ArrowRight aria-hidden size={16} />
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="section" aria-labelledby="control-title">
        <div className="section__inner">
          <Reveal className="section__head">
            <span className="label">Governance</span>
            <h2 id="control-title" className="h2">
              Your DAO stays in control.
            </h2>
            <p className="section__lead">
              Your treasury stays in your DAO. Money moves only when your DAO votes: once to fund a round, and once for
              each payment. Polestar never calls into your DAO.
            </p>
          </Reveal>
          <ControlDiagram />
        </div>
      </section>

      <section className="section section--dark" aria-labelledby="dev-title">
        <div className="section__inner dev">
          <Reveal className="dev__copy">
            <span className="label">For developers</span>
            <h2 id="dev-title" className="h2">
              Build on Polestar.
            </h2>
            <p className="section__lead">
              A typed SDK reads rounds and results without a wallet, sends every transaction with exact amounts, and
              prepares the DAO proposals a council approves. No runtime dependencies.
            </p>
            <div className="dev__install">
              <code>{INSTALL}</code>
              <CopyButton text={INSTALL} label="Copy install command" />
            </div>
            <ul className="dev__links">
              <li>
                <a href={LINKS.sdkDocs} target="_blank" rel="noreferrer" className="text-link">
                  SDK documentation <ArrowUpRight aria-hidden size={16} />
                </a>
              </li>
              <li>
                <a href={LINKS.deployDocs} target="_blank" rel="noreferrer" className="text-link">
                  Deploy your own <ArrowUpRight aria-hidden size={16} />
                </a>
              </li>
              <li>
                <a href={LINKS.repo} target="_blank" rel="noreferrer" className="text-link">
                  Source on GitHub <ArrowUpRight aria-hidden size={16} />
                </a>
              </li>
            </ul>
          </Reveal>
          <Reveal delay={0.15} className="dev__code">
            <CodeCard title="read-round.ts" code={SNIPPET} />
            <p className="dev__note">
              <Blocks aria-hidden size={16} /> Works in browsers and Node.js 20.12+.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section" aria-labelledby="faq-title">
        <div className="section__inner section__inner--narrow">
          <Reveal className="section__head">
            <span className="label">Questions</span>
            <h2 id="faq-title" className="h2">
              Asked often.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <FaqAccordion items={FAQ_TEASER} />
          </Reveal>
          <Reveal className="section__foot">
            <Link to="/faq" className="text-link">
              All questions <ArrowRight aria-hidden size={16} />
            </Link>
          </Reveal>
        </div>
      </section>

      <CtaBand />
    </div>
  );
}
