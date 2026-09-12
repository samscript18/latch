"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { OnboardingModal } from "./onboarding-modal";
import { useWalletSession } from "./wallet-session";

const navigation = [
  { href: "/app", label: "Overview", icon: "⌂" },
  { href: "/app/agents", label: "AI workers", icon: "◇" },
  { href: "/app/activity", label: "Activity", icon: "≋" },
  { href: "/app/integrations", label: "Integrations", icon: "↗" },
];

const shortAddress = (value?: string) =>
  value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "Connect admin wallet";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const session = useWalletSession();
  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <Link className="sidebar-brand" href="/">
          <span className="brand-mark">L</span>
          <span>LATCH</span>
        </Link>
        <div className="workspace-switcher">
          <span>{session.profile?.organization?.name?.slice(0, 1) || "—"}</span>
          <div>
            <strong>
              {session.profile?.organization?.name || "Workspace"}
            </strong>
            <small>
              {session.profile?.organization?.ensName || "Setup required"}
            </small>
          </div>
        </div>
        <nav className="sidebar-nav" aria-label="Application navigation">
          <p>Workspace</p>
          {navigation.map((item) => {
            const active =
              item.href === "/app"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            return (
              <Link
                className={active ? "active" : ""}
                href={item.href}
                key={item.href}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-security">
          <span>Protected pipeline</span>
          <strong>ENSv2 → CRE → Bazantic</strong>
        </div>
        <Link className="sidebar-back" href="/">
          ← Public website
        </Link>
      </aside>
      <div className="app-content">
        <header className="app-topbar">
          <div>
            <span className="environment-dot" /> Sepolia workspace
          </div>
          {session.connected && session.token ? (
            <button
              className="wallet-control"
              onClick={session.disconnectWallet}
            >
              <span className="wallet-avatar" />
              {shortAddress(session.address)}
              <small>Disconnect</small>
            </button>
          ) : (
            <button
              className="button button-primary"
              disabled={session.authenticating}
              onClick={session.connectAndAuthenticate}
            >
              {session.authenticating
                ? "Check your wallet…"
                : session.connected
                  ? "Sign in with wallet"
                  : "Connect admin wallet"}
            </button>
          )}
        </header>
        {session.error && (
          <div className="app-session-error notice error">{session.error}</div>
        )}
        {!session.token ? (
          <section className="wallet-gate">
            <p className="eyebrow">Admin access</p>
            <h1>Connect the wallet that controls your organization.</h1>
            <p>
              LATCH uses a short-lived signed session. Your private key never
              leaves your wallet and no transaction is sent during sign-in.
            </p>
            <button
              className="button button-primary"
              disabled={session.authenticating}
              onClick={session.connectAndAuthenticate}
            >
              {session.authenticating
                ? "Waiting for signature…"
                : "Connect and sign in"}
            </button>
          </section>
        ) : (
          children
        )}
      </div>
      <OnboardingModal />
    </div>
  );
}
