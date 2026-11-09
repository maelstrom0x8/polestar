import { Link, NavLink } from "react-router-dom";
import { useScrolled } from "../../lib/useScrolled";

export function Nav() {
  const scrolled = useScrolled();

  return (
    <div className="nav-wrap">
      <header className={`nav${scrolled ? " nav--scrolled" : ""}`}>
        <div className="nav__inner">
          <NavLink to="/" className="nav__brand">
            POLESTAR
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
            <Link to="/rounds" className="btn btn-primary">
              Get started
            </Link>
          </div>
        </div>
      </header>
    </div>
  );
}
