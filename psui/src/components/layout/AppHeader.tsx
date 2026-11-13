import { Link, NavLink } from "react-router-dom";
import polestarWordmark from "../../assets/polestar.svg";
import { useWallet } from "../../lib/wallet";
import { AccountButton } from "./AccountButton";

const SECTIONS = [
  { to: "/rounds", label: "Rounds" },
  { to: "/proposals", label: "Proposals" },
];

/**
 * In-flow header for app pages, distinct from Nav, the landing page's own
 * fixed, scroll-reactive overlay. Carries the wallet state so it stays
 * visible on every app route.
 */
export function AppHeader() {
  const { accountId } = useWallet();
  return (
    <header className="app-header">
      <Link to={accountId ? "/rounds" : "/"} className="app-header__brand">
        <img src={polestarWordmark} alt="Polestar" className="app-header__brand-mark" />
      </Link>
      <nav className="app-header__nav" aria-label="Sections">
        {SECTIONS.map((section) => (
          <NavLink key={section.to} to={section.to} className="app-header__link">
            {section.label}
          </NavLink>
        ))}
      </nav>
      <div className="app-header__actions">
        <AccountButton />
      </div>
    </header>
  );
}
