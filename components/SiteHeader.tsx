import Link from "next/link";
import type { ReactNode } from "react";

export type SiteHeaderLink = {
  label: string;
  href: string;
  variant?: "default" | "cta";
  icon?: ReactNode;
};

export type SiteHeaderProps = {
  logoSrc: string;
  logoAlt: string;
  brandName: string;
  links: SiteHeaderLink[];
};

export default function SiteHeader({
  logoSrc,
  logoAlt,
  brandName,
  links
}: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="brand-left">
          <Link className="brand-logo" href="/">
            <img src={logoSrc} alt={logoAlt} />
            <div className="brand-name">
              <strong>{brandName}</strong>
            </div>
          </Link>
        </div>

        <nav className="header-nav" aria-label="Menu principal">
          {links.map((l) => (
            <Link
              key={`${l.href}-${l.label}`}
              className={`nav-link${l.variant === "cta" ? " nav-cta" : ""}`}
              href={l.href}
              aria-label={l.label}
            >
              {l.icon ? <span className="nav-icon" aria-hidden>{l.icon}</span> : null}
              <span className="nav-text">{l.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
