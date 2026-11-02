import { Link } from "react-router-dom";

interface FooterLink {
  label: string;
  to: string;
}

interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: "Product",
    links: [
      { label: "Rounds", to: "/rounds" },
      { label: "Design System", to: "/design-system" },
      { label: "Roadmap", to: "#" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Documentation", to: "#" },
      { label: "GitHub", to: "#" },
      { label: "Status", to: "#" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", to: "#" },
      { label: "Contact", to: "#" },
      { label: "Privacy Policy", to: "#" },
    ],
  },
];

function FooterLinkItem({ link }: { link: FooterLink }) {
  if (link.to.startsWith("/")) {
    return (
      <Link to={link.to} className="landing-footer__link">
        {link.label}
      </Link>
    );
  }
  return (
    <a href={link.to} className="landing-footer__link">
      {link.label}
    </a>
  );
}

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer__inner">
        <div className="landing-footer__top">
          <div className="landing-footer__brand">
            <span className="nav__brand">POLESTAR</span>
            <p className="landing-footer__meta" style={{ marginTop: 12 }}>
              Participatory budgeting on top of SputnikDAO. Built for the NEAR Hackathon.
            </p>
          </div>

          <div className="landing-footer__grid">
            {FOOTER_COLUMNS.map((column) => (
              <div className="landing-footer__column" key={column.heading}>
                <span className="label">{column.heading}</span>
                <nav>
                  {column.links.map((link) => (
                    <FooterLinkItem key={link.label} link={link} />
                  ))}
                </nav>
              </div>
            ))}
          </div>
        </div>

        <div className="landing-footer__bottom">
          <span className="landing-footer__meta">&copy; 2026 Polestar</span>
          <span className="landing-footer__meta">Testnet only &middot; Not audited</span>
        </div>
      </div>
    </footer>
  );
}
