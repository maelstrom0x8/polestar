import { Link, NavLink } from "react-router-dom";
import polestarWordmark from "../../assets/polestar.svg";
import { useNearFooter } from "../../lib/useNearFooter";
import { useScrolled } from "../../lib/useScrolled";
import { useWallet } from "../../lib/wallet";
import { AccountButton } from "./AccountButton";

export function Nav() {
  const scrolled = useScrolled();
  const nearFooter = useNearFooter();
  const { accountId } = useWallet();

  return (
    <div className={`nav-wrap${nearFooter ? " nav-wrap--hidden" : ""}`}>
      <header className={`nav${scrolled ? " nav--scrolled" : ""}`}>
        <div className="nav__inner">
          <NavLink to="/" className="nav__brand">
            {/* Placeholder wordmark (text-to-svg render) until a real logo exists. */}
            <img src={polestarWordmark} alt="Polestar" className="nav__brand-mark" />
          </NavLink>
          <nav className="nav__links">
            <NavLink to="/rounds" className="nav__link">
              Rounds
            </NavLink>
            <a href="/#how-it-works" className="nav__link">
              How it works
            </a>
          </nav>
          <div className="nav__actions">
            <AccountButton />
            {/* Once signed in, the account takes this slot: "Get started"
                would only repeat the centred Rounds link, and both
                together don't fit the condensed pill. */}
            {!accountId && (
              <Link to="/rounds" className="btn btn-primary">
                Get started
              </Link>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}
