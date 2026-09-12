import Link from "next/link";
import type { ReactNode } from "react";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="site-brand" href="/">
        <span>L</span>LATCH
      </Link>
      <nav aria-label="Public navigation">
        <Link href="/product">Product</Link>
        <Link href="/architecture">Architecture</Link>
        <Link href="/security">Security</Link>
      </nav>
      <Link className="button button-primary" href="/app">
        Launch LATCH
      </Link>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <strong>LATCH</strong>
        <p>Authorization infrastructure for autonomous AI workers.</p>
      </div>
      <div>
        <Link href="/product">Product</Link>
        <Link href="/architecture">Architecture</Link>
        <Link href="/security">Security</Link>
        <Link href="/app">Application</Link>
      </div>
    </footer>
  );
}

export function PublicPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="public-shell">
      <SiteHeader />
      <header className="public-page-hero">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{intro}</p>
      </header>
      {children}
      <SiteFooter />
    </main>
  );
}
