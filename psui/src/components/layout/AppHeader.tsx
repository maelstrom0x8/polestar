import { Link } from "react-router-dom";
import polestarWordmark from "../../assets/polestar.svg";
import { AccountButton } from "./AccountButton";

/**
 * In-flow header for app pages — distinct from Nav, the landing page's own
 * fixed, scroll-reactive overlay. Carries the wallet state so it stays
 * visible on every app route.
 */
export function AppHeader() {
  return (
    <header className="app-header">
      <Link to="/" className="app-header__brand">
        <img src={polestarWordmark} alt="Polestar" className="app-header__brand-mark" />
      </Link>
      <div className="app-header__actions">
        <AccountButton />
      </div>
    </header>
  );
}
