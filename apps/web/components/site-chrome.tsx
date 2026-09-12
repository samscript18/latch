import Link from "next/link";
import type { ReactNode } from "react";
import { LatchMark } from "./latch-logo";

export function SiteHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between px-6">
        <Link
          className="group flex cursor-pointer items-center gap-2.5 transition-colors"
          href="/"
        >
          <span className="inline-flex items-center gap-2.5 text-[15px] font-semibold tracking-tight text-foreground">
            <LatchMark className="size-8 shrink-0 transition-transform duration-300 group-hover:scale-105" />
            <span>LATCH</span>
          </span>
          <span className="hidden md:inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
            Sepolia · ENSv2
          </span>
        </Link>

        <nav
          aria-label="Public navigation"
          className="hidden md:flex items-center gap-8 text-sm text-muted"
        >
          <Link
            className="cursor-pointer transition-colors duration-200 hover:text-foreground"
            href="/product"
          >
            Product
          </Link>
          <Link
            className="cursor-pointer transition-colors duration-200 hover:text-foreground"
            href="/architecture"
          >
            Architecture
          </Link>
          <Link
            className="cursor-pointer transition-colors duration-200 hover:text-foreground"
            href="/security"
          >
            Security
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link className="brand-button" href="/app">
            <span>Launch LATCH</span>
            <svg
              className="size-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M7 17L17 7M17 7H7M17 7V17"
              />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-[#050607] py-14 px-6">
      <div className="mx-auto flex max-w-[1360px] flex-col justify-between gap-10 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <LatchMark className="size-6 shrink-0" />
            <strong className="text-sm font-semibold tracking-wide text-foreground">
              LATCH
            </strong>
          </div>
          <p className="mt-2 text-xs text-muted">
            Verifiable identity, confidential policy, and revocable authority for
            autonomous AI workers.
          </p>
        </div>
        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap gap-6 text-xs text-muted"
        >
          <Link className="transition-colors hover:text-foreground" href="/product">
            Product
          </Link>
          <Link
            className="transition-colors hover:text-foreground"
            href="/architecture"
          >
            Architecture
          </Link>
          <Link
            className="transition-colors hover:text-foreground"
            href="/security"
          >
            Security
          </Link>
          <Link className="transition-colors hover:text-foreground" href="/app">
            Workspace Console
          </Link>
        </nav>
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
    <div className="min-h-full flex flex-col bg-black text-foreground font-sans overflow-x-hidden">
      <SiteHeader />
      <main className="relative flex flex-1 flex-col overflow-hidden pb-24">
        <header className="public-page-hero">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[#4efa94]">
            <span className="size-1.5 rounded-full bg-[#4efa94]" />
            {eyebrow}
          </span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tighter text-foreground md:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted md:text-lg">
            {intro}
          </p>
        </header>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
