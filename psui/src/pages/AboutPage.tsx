import { ArrowUpRight, BadgeCheck, Eye, Gavel, Landmark, Milestone, Scale, ShieldCheck, Users, Vote } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { CtaBand } from "../components/landing/CtaBand";
import { EASE, Reveal, Stagger, StaggerItem } from "../components/landing/Reveal";
import { SplitComparison } from "../components/landing/SplitComparison";
import { LINKS } from "../lib/links";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const PROBLEMS = [
  {
    Icon: Gavel,
    title: "A council decides alone",
    body: "A grants committee carries the whole decision, and the community's priorities reach it second-hand, if at all.",
  },
  {
    Icon: Users,
    title: "A vote count rewards the biggest group",
    body: "When the most-approved projects win, a majority can take the whole budget and every smaller group gets nothing.",
  },
];

const RULES = [
  {
    title: "Everyone gets an equal share",
    body: "The round's budget is divided equally between everyone who voted.",
  },
  {
    title: "Projects are bought by the people who want them",
    body: "A project is funded when its supporters can pay its cost together from their shares. The cheapest per supporter goes first, and its supporters pay for it.",
  },
  {
    title: "What's left over is still spent",
    body: "When no project can be paid for by its own supporters, the leftover funds the projects with the most supporters per NEAR that still fit.",
  },
];

const WALKTHROUGH = [
  "Each voter's share is 1 NEAR. A and B would each cost their six supporters about 0.83 NEAR apiece; C would cost its four supporters 1 NEAR each.",
  "A and B are cheapest per supporter and tie, so the lower-numbered one goes first: A is funded, and its six supporters have about 0.17 NEAR left each.",
  "B needs 5 NEAR, but its supporters now hold 1 NEAR between them. C's four supporters can still pay 1 NEAR each: C is funded.",
  "Nothing else can be paid for, and B's 5 NEAR doesn't fit in the 1 NEAR left. The six voters directed 5 NEAR, the four directed 4.",
];

const PHASES = [
  {
    Icon: Landmark,
    who: "DAO council",
    title: "Fund the round",
    body: "The DAO votes to fund a round: its budget, a registration cutoff and a voting deadline, and, if it likes, a community name that limits voting to members.",
  },
  {
    Icon: Milestone,
    who: "Builders and voters",
    title: "Propose and register",
    body: "Anyone can propose a project with its cost split into milestones. Voters register before the cutoff.",
  },
  {
    Icon: Vote,
    who: "Voters",
    title: "Vote",
    body: "Registered voters approve every project they'd like funded. There's no ranking, and every ballot is final and public.",
  },
  {
    Icon: Scale,
    who: "Anyone",
    title: "Count",
    body: "Once voting closes, anyone can end it and run the count. Every result can be recomputed by anyone from the public ballots.",
  },
  {
    Icon: BadgeCheck,
    who: "DAO council",
    title: "Pay as teams deliver",
    body: "The DAO approves each milestone as it's delivered, and can return whatever the count left unallocated to the treasury.",
  },
];

const PRINCIPLES = [
  {
    Icon: ShieldCheck,
    title: "The DAO stays in control",
    body: "Funding a round and paying a milestone are your DAO's own proposals, voted under its own rules. Polestar has no admin role and no vote of its own.",
  },
  {
    Icon: Milestone,
    title: "Paid on delivery",
    body: "Money allocated to a project is released one milestone at a time, and only after the DAO confirms the work.",
  },
  {
    Icon: Eye,
    title: "Public by default",
    body: "Projects, ballots and results live on the NEAR blockchain. Anyone can read them and check the count.",
  },
  {
    Icon: Landmark,
    title: "Built on what you use",
    body: "Any SputnikDAO works unmodified, and members-only rounds use the NEAR names your community already controls.",
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
            Polestar helps a community with a shared treasury decide together how to spend it. Members back projects,
            the budget is split so that every group gets a fair part of it, and the DAO that holds the money keeps the
            final say on every payment.
          </motion.p>
        </div>
      </header>

      <section className="section" aria-labelledby="problem-title">
        <div className="section__inner">
          <Reveal className="section__head">
            <span className="label">The problem</span>
            <h2 id="problem-title" className="h2">
              Two common ways to split a budget, and what they miss.
            </h2>
          </Reveal>
          <Stagger className="cards cards--two">
            {PROBLEMS.map((problem) => (
              <StaggerItem className="card" key={problem.title}>
                <span className="card__icon">
                  <problem.Icon aria-hidden size={22} />
                </span>
                <h3 className="card__title">{problem.title}</h3>
                <p className="card__body">{problem.body}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="section section--tinted" id="equal-shares" aria-labelledby="shares-title">
        <div className="section__inner">
          <Reveal className="section__head">
            <span className="label">How the split works</span>
            <h2 id="shares-title" className="h2">
              The Method of Equal Shares.
            </h2>
            <p className="section__lead">
              A rule from participatory budgeting research for dividing one fixed budget between many competing
              projects, so that each group of voters gets a part in line with its size.
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

          <Reveal className="example__head">
            <h3 className="h3 example__title">A worked example</h3>
            <p className="section__lead">
              A round has 10 NEAR and 10 voters. Six approve projects A and B, which cost 5 NEAR each. Four approve only
              C, which costs 4 NEAR.
            </p>
          </Reveal>
          <Reveal>
            <SplitComparison />
          </Reveal>
          <Stagger className="walkthrough">
            {WALKTHROUGH.map((step, index) => (
              <StaggerItem className="walkthrough__step" key={step}>
                <span className="walkthrough__index figure">{index + 1}</span>
                <p>{step}</p>
              </StaggerItem>
            ))}
          </Stagger>
          <Reveal className="note">
            <p>
              Every count is exact, with no rounding, and the counting engine is tested against an independent reference
              implementation. The rule is proportional to whoever votes; who may vote is decided separately, by
              registration and, for members-only rounds, by the community's own NEAR name.
            </p>
            <p className="note__credit">
              The Method of Equal Shares was developed by Dominik Peters, Grzegorz Pierczyński and Piotr Skowron.{" "}
              <a href={LINKS.equalShares} target="_blank" rel="noreferrer" className="text-link">
                equalshares.net <ArrowUpRight aria-hidden size={14} />
              </a>
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section" aria-labelledby="round-title">
        <div className="section__inner section__inner--split">
          <Reveal className="section__head section__head--sticky">
            <span className="label">A round, start to finish</span>
            <h2 id="round-title" className="h2">
              From budget to paid milestones.
            </h2>
            <p className="section__lead">
              Every round runs the same five steps, and each step says who can take it. Rounds are independent, so one
              can be paying out while the next takes proposals.
            </p>
          </Reveal>
          <Timeline />
        </div>
      </section>

      <section className="section section--tinted" aria-labelledby="principles-title">
        <div className="section__inner">
          <Reveal className="section__head">
            <span className="label">Principles</span>
            <h2 id="principles-title" className="h2">
              What Polestar holds to.
            </h2>
          </Reveal>
          <Stagger className="cards cards--four">
            {PRINCIPLES.map((principle) => (
              <StaggerItem className="card" key={principle.title}>
                <span className="card__icon">
                  <principle.Icon aria-hidden size={22} />
                </span>
                <h3 className="card__title">{principle.title}</h3>
                <p className="card__body">{principle.body}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="section" aria-labelledby="open-title">
        <div className="section__inner section__inner--narrow open-source">
          <Reveal>
            <span className="label">Open source</span>
            <h2 id="open-title" className="h2">
              Read it, run it, build on it.
            </h2>
            <p className="section__lead">
              The contract, the counting engine, the TypeScript SDK and this app are open source under the Apache-2.0
              license.
            </p>
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
