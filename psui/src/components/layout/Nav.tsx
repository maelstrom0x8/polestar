import { ArrowUpRight, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import polestarWordmark from "../../assets/polestar.svg";
import { LINKS } from "../../lib/links";
import { useNearFooter } from "../../lib/useNearFooter";
import { useScrolled } from "../../lib/useScrolled";
import { useWallet } from "../../lib/wallet";
import { EASE } from "../landing/Reveal";
import { AccountButton } from "./AccountButton";

const ROUTES = [
  { to: "/rounds", label: "Rounds" },
  { to: "/about", label: "About" },
  { to: "/faq", label: "FAQ" },
];

export function Nav() {
  const scrolled = useScrolled();
  const nearFooter = useNearFooter();
  const { accountId } = useWallet();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    sheetRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  function close() {
    setOpen(false);
    toggleRef.current?.focus();
  }

  function onSheetKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      close();
      return;
    }
    if (event.key !== "Tab" || !sheetRef.current) return;
    const focusable = Array.from(sheetRef.current.querySelectorAll<HTMLElement>("a, button"));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const marker = hovered ?? ROUTES.find((r) => pathname.startsWith(r.to))?.to ?? null;

  return (
    <div className={`nav-wrap${nearFooter && !open ? " nav-wrap--hidden" : ""}`}>
      <header className={`nav${scrolled || open ? " nav--scrolled" : ""}${open ? " nav--open" : ""}`}>
        <div className="nav__inner">
          <Link to="/" className="nav__brand" aria-label="Polestar home">
            <img src={polestarWordmark} alt="Polestar" className="nav__brand-mark" />
          </Link>
          <nav className="nav__links" aria-label="Main" onMouseLeave={() => setHovered(null)}>
            {ROUTES.map((route) => (
              <NavLink
                key={route.to}
                to={route.to}
                className="nav__link"
                onMouseEnter={() => setHovered(route.to)}
                onFocus={() => setHovered(route.to)}
                onBlur={() => setHovered(null)}
              >
                {route.label}
                {marker === route.to && (
                  <motion.span layoutId="nav-marker" className="nav__marker" transition={{ duration: 0.4, ease: EASE }} />
                )}
              </NavLink>
            ))}
            <a href={LINKS.docs} target="_blank" rel="noreferrer" className="nav__link nav__link--external">
              Docs
              <ArrowUpRight aria-hidden size={14} />
            </a>
          </nav>
          <div className="nav__actions">
            <AccountButton />
            {!accountId && (
              <Link to="/rounds" className="btn btn-primary nav__cta">
                Get started
              </Link>
            )}
            <button
              ref={toggleRef}
              type="button"
              className="nav__toggle"
              aria-expanded={open}
              aria-controls="nav-sheet"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              id="nav-sheet"
              ref={sheetRef}
              className="nav-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              onKeyDown={onSheetKey}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              <nav className="nav-sheet__links" aria-label="Menu">
                {ROUTES.map((route, index) => (
                  <motion.div
                    key={route.to}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: EASE, delay: 0.05 + index * 0.05 }}
                  >
                    <NavLink to={route.to} className="nav-sheet__link">
                      {route.label}
                    </NavLink>
                  </motion.div>
                ))}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE, delay: 0.05 + ROUTES.length * 0.05 }}
                >
                  <a href={LINKS.docs} target="_blank" rel="noreferrer" className="nav-sheet__link">
                    Docs <ArrowUpRight aria-hidden size={18} />
                  </a>
                </motion.div>
              </nav>
              <div className="nav-sheet__actions">
                <AccountButton />
                {!accountId && (
                  <Link to="/rounds" className="btn btn-primary">
                    Get started
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </div>
  );
}
