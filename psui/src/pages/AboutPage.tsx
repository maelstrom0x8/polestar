import { ArrowUpRight, BadgeCheck, Landmark, Milestone, Scale, Vote } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { CtaBand } from "../components/landing/CtaBand";
import { EASE, Reveal, Stagger, StaggerItem } from "../components/landing/Reveal";
import { LINKS } from "../lib/links";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const RULES = [
  {
    title: "Everyone gets an equal share",
    body: "The round's budget is divided equally between everyone who votes.",
  },
  {
    title: "Shares buy the projects you back",
    body: "A project is funded when its supporters can cover its cost together from their shares.",
  },
  {
    title: "Nothing sits idle",
    body: "Leftover budget goes to the projects with the most backing per NEAR that still fit.",
  },
];

const PHASES = [
  {
    Icon: Landmark,
    who: "DAO council",
    title: "Fund the round",
    body: "The DAO votes in a budget, a registration cutoff and a voting deadline, with members-only voting if it wants it.",
  },
  {
    Icon: Milestone,
    who: "Builders and voters",
    title: "Propose and register",
    body: "Builders propose projects with milestone budgets. Voters register before the cutoff.",
  },
  {
    Icon: Vote,
    who: "Voters",
    title: "Vote",
    body: "Voters approve every project they'd fund. Ballots are final and public.",
  },
  {
    Icon: Scale,
    who: "Anyone",
    title: "Count",
    body: "Anyone can close voting and run the count, and anyone can check the result.",
  },
  {
    Icon: BadgeCheck,
    who: "DAO council",
    title: "Pay as teams deliver",
    body: "The DAO approves each milestone, and the payment goes straight to the team.",
  },
];

function Timeline() {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const progress = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <ol className="timeline" ref={ref}>
      <span className="timeline__rail" aria-hidden="true">
        <motion.span className="timeline__fill" style={{ scaleY: progress }} />
      </span>
      {PHASES.map((phase, index) => (
        <motion.li
          className="timeline__item"
          key={phase.title}
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <span className="timeline__marker">
            <phase.Icon aria-hidden size={18} />
          </span>
          <div className="timeline__content">
            <span className="timeline__meta">
              <span className="figure">{String(index + 1).padStart(2, "0")}</span> · {phase.who}
            </span>
            <h3 className="timeline__title">{phase.title}</h3>
            <p className="timeline__body">{phase.body}</p>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}

export function AboutPage() {
  useDocumentTitle("About");

  return (
    <div className="page-marketing">
      <header className="page-hero">
        <div className="page-hero__inner">
          <motion.span
            className="eyebrow"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            About Polestar
          </motion.span>
          <motion.h1
            className="display page-hero__title"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
          >
            Shared money, decided together.
          </motion.h1>
          <motion.p
            className="page-hero__lead"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.25 }}
          >
            Polestar runs funding rounds for a DAO's treasury. Members back projects, every group gets a fair part of the
            budget, and teams are paid as they deliver.
          </motion.p>
        </div>
      </header>

      <section className="section section--tinted" id="equal-shares" aria-labelledby="shares-title">
        <div className="section__inner">
          <Reveal className="section__head">
            <span className="label">How the split works</span>
            <h2 id="shares-title" className="h2">
              Fair to every group, not just the biggest.
            </h2>
            <p className="section__lead">
              Polestar counts with the Method of Equal Shares, so each group of voters gets a part of the budget in line
              with its size.
            </p>
          </Reveal>
          <Stagger className="rules">
            {RULES.map((rule, index) => (
              <StaggerItem className="rule" key={rule.title}>
                <span className="rule__number figure">{index + 1}</span>
                <h3 className="rule__title">{rule.title}</h3>
                <p className="rule__body">{rule.body}</p>
              </StaggerItem>
            ))}
          </Stagger>

        </div>
      </section>

      <section className="section" aria-labelledby="round-title">
        <div className="section__inner section__inner--split">
          <Reveal className="section__head section__head--sticky">
            <span className="label">A round, start to finish</span>
            <h2 id="round-title" className="h2">
              From budget to paid milestones.
            </h2>
            <p className="section__lead">Five steps, each with a clear owner. Rounds run side by side.</p>
          </Reveal>
          <Timeline />
        </div>
      </section>

      <section className="section section--tinted" aria-labelledby="open-title">
        <div className="section__inner section__inner--narrow open-source">
          <Reveal>
            <span className="label">Open source</span>
            <h2 id="open-title" className="h2">
              Read it, run it, build on it.
            </h2>
            <p className="section__lead">The contract, SDK and app are Apache-2.0.</p>
            <ul className="dev__links dev__links--row">
              <li>
                <a href={LINKS.repo} target="_blank" rel="noreferrer" className="text-link">
                  GitHub <ArrowUpRight aria-hidden size={16} />
                </a>
              </li>
              <li>
                <a href={LINKS.docs} target="_blank" rel="noreferrer" className="text-link">
                  Documentation <ArrowUpRight aria-hidden size={16} />
                </a>
              </li>
              <li>
                <a href={LINKS.sdkNpm} target="_blank" rel="noreferrer" className="text-link">
                  SDK on npm <ArrowUpRight aria-hidden size={16} />
                </a>
              </li>
            </ul>
          </Reveal>
        </div>
      </section>

      <CtaBand />
    </div>
  );
}
