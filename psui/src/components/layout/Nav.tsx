import { NavLink } from "react-router-dom";
import { ThemeToggle } from "../ThemeToggle";

function linkClassName({ isActive }: { isActive: boolean }) {
  return `nav__link${isActive ? " nav__link--active" : ""}`;
}

export function Nav() {
  return (
    <header className="nav">
      <div className="nav__inner">
        <NavLink to="/" className="nav__brand">
          POLESTAR
        </NavLink>
        <nav className="nav__links">
          <NavLink to="/" end className={linkClassName}>
            Rounds
          </NavLink>
          <NavLink to="/design-system" className={linkClassName}>
            Design System
          </NavLink>
        </nav>
        <div className="nav__actions">
          <ThemeToggle />
          <button
            type="button"
            className="btn btn-secondary"
            disabled
            title="Wallet connection is not implemented yet"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    </header>
  );
}
