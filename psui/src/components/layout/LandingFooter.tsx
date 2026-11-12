import { ArrowUp, ArrowUpRight } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import polestarWordmark from "../../assets/polestar.svg";
import { LINKS } from "../../lib/links";
import { GithubMark } from "../landing/GithubMark";

type FooterLink = { label: string; to?: string; href?: string };

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Rounds", to: "/rounds" },
      { label: "Propose a project", to: "/propose" },
      { label: "Proposals", to: "/proposals" },
    ],
  },
  {
    title: "Learn",
    links: [
      { label: "About", to: "/about" },
      { label: "FAQ", to: "/faq" },
      { label: "Documentation", href: LINKS.docs },
      { label: "How the split works", href: LINKS.splitDocs },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "SDK on npm", href: LINKS.sdkNpm },
      { label: "GitHub", href: LINKS.repo },
      { label: "Deploy your own", href: LINKS.deployDocs },
      { label: "Contract reference", href: LINKS.contractReference },
    ],
  },
  {
    title: "Built on",
    links: [
      { label: "NEAR Protocol", href: LINKS.near },
      { label: "SputnikDAO", href: LINKS.sputnik },
    ],
  },
];

function FooterItem({ link }: { link: FooterLink }) {
  if (link.to) {
    return (
      <Link to={link.to} className="footer__link">
        {link.label}
      </Link>
    );
  }
  return (
    <a href={link.href} target="_blank" rel="noreferrer" className="footer__link">
      {link.label}
      <ArrowUpRight aria-hidden size={14} className="footer__link-icon" />
    </a>
  );
}

export function LandingFooter() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const ghostY = useTransform(scrollYProgress, [0, 1], ["40%", "0%"]);
  const ghostOpacity = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <footer ref={ref} className="landing-footer footer">
      <div className="footer__inner">
        <div className="footer__top">
          <div className="footer__brand">
            <img src={polestarWordmark} alt="Polestar" className="footer__wordmark" />
            <p className="footer__tagline">
              Participatory budgeting for DAO treasuries. Members back projects, the budget is split fairly, and teams
              are paid as they deliver.
            </p>
            <a href={LINKS.repo} target="_blank" rel="noreferrer" className="footer__social" aria-label="Polestar on GitHub">
              <GithubMark />
            </a>
          </div>
          <div className="footer__grid">
            {COLUMNS.map((column) => (
              <div className="footer__column" key={column.title}>
                <h2 className="footer__heading">{column.title}</h2>
                <ul>
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <FooterItem link={link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="footer__bottom">
          <span>&copy; 2026 Polestar</span>
          <a href={LINKS.license} target="_blank" rel="noreferrer" className="footer__meta-link">
            Apache-2.0 license
          </a>
          <button
            type="button"
            className="footer__top-button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            Back to top <ArrowUp aria-hidden size={14} />
          </button>
        </div>
      </div>
      <motion.div className="footer__ghost" aria-hidden="true" style={{ y: ghostY, opacity: ghostOpacity }}>
        POLESTAR
      </motion.div>
    </footer>
  );
}
