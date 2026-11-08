import { NavLink } from "react-router-dom";
import { useScrolled } from "../../lib/useScrolled";

export function Nav() {
  const scrolled = useScrolled();

  return (
    <header className={`nav${scrolled ? " nav--scrolled" : ""}`}>
      <div className="nav__inner">
        <NavLink to="/" className="nav__brand">
          POLESTAR
        </NavLink>
        <nav className="nav__links">
          <NavLink to="/rounds" className="nav__link">
            Rounds
          </NavLink>
        </nav>
        <div className="nav__actions">
          <button
            type="button"
            className="btn btn-secondary"
            disabled
            title="Wallet connection is not implemented yet (T5)"
          >
            Sign in
          </button>
        </div>
      </div>
    </header>
  );
}
