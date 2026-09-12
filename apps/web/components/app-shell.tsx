"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LatchMark } from "./latch-logo";
import { OnboardingModal } from "./onboarding-modal";
import { useWalletSession } from "./wallet-session";

const navigation = [
	{ href: "/app", label: "Overview", icon: "⌂" },
	{ href: "/app/try", label: "Try Now", icon: "↯" },
	{ href: "/app/agents", label: "AI Workers", icon: "◇" },
	{ href: "/app/tasks", label: "Tasks", icon: "✓" },
	{ href: "/app/activity", label: "Activity Stream", icon: "≋" },
	{ href: "/app/settings", label: "Settings", icon: "⚙" },
];

const shortAddress = (value?: string) => (value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "Connect admin wallet");

export function AppShell({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	const session = useWalletSession();
	const [navigationOpen, setNavigationOpen] = useState(false);

	useEffect(() => {
		if (!navigationOpen) return;
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") setNavigationOpen(false);
		};
		document.addEventListener("keydown", closeOnEscape);
		return () => document.removeEventListener("keydown", closeOnEscape);
	}, [navigationOpen]);

	return (
		<div className="app-frame">
			<button className={`mobile-sidebar-backdrop ${navigationOpen ? "visible" : ""}`} aria-label="Close navigation" onClick={() => setNavigationOpen(false)} tabIndex={navigationOpen ? 0 : -1} />
			<aside className={`app-sidebar ${navigationOpen ? "mobile-open" : ""}`} id="app-navigation">
				<div className="sidebar-header">
					<Link className="sidebar-brand" href="/">
						<LatchMark className="size-7 shrink-0" />
						<span>LATCH</span>
					</Link>
					<button className="sidebar-close" aria-label="Close navigation" onClick={() => setNavigationOpen(false)}>×</button>
				</div>

				<div className="workspace-switcher">
					<span>{session.profile?.organization?.name?.slice(0, 1) || "—"}</span>
					<div>
						<strong>{session.profile?.organization?.name || "Workspace"}</strong>
						<small>{session.profile?.organization?.ensName || "Setup required"}</small>
					</div>
				</div>

				<nav className="sidebar-nav" aria-label="Application navigation">
					<p>Workspace</p>
					{navigation.map((item) => {
						const active = item.href === "/app" ? pathname === item.href : pathname.startsWith(item.href);
						return (
							<Link className={active ? "active" : ""} href={item.href} key={item.href} onClick={() => setNavigationOpen(false)} title={item.label}>
								<span aria-hidden="true">{item.icon}</span>
								<span>{item.label}</span>
							</Link>
						);
					})}
				</nav>

				<div className="sidebar-security">
					<span>Pipeline Boundary</span>
					<strong>ENSv2 → CRE → Bazantic</strong>
				</div>

				<div className="mt-4 pt-3 border-t border-white/5">
					<div className="flex items-center gap-2 font-mono text-[10px] text-muted">
						<span className="relative flex h-1.5 w-1.5 rounded-full bg-[#4efa94]">
							<span className="absolute inset-0 animate-ping rounded-full bg-[#4efa94] opacity-60" />
						</span>
						<span>indexer live · Sepolia ENS</span>
					</div>
				</div>

				<Link className="sidebar-back" href="/">
					← Public website
				</Link>
			</aside>

			<div className="app-content">
				<header className="app-topbar">
					<div className="app-topbar-context">
						<button className="sidebar-menu-button" aria-controls="app-navigation" aria-expanded={navigationOpen} aria-label="Open navigation" onClick={() => setNavigationOpen(true)}><span /><span /><span /></button>
						<div className="flex items-center text-xs text-muted font-mono">
							<span className="environment-dot" />
							<span>Sepolia Testnet Workspace</span>
						</div>
					</div>

					{session.connected && session.token ? (
						<div className="flex items-center gap-3">
							<button className="wallet-control group" onClick={session.disconnectWallet} title="Click to disconnect">
								<span className="wallet-avatar" />
								<span className="text-foreground/90">{shortAddress(session.address)}</span>
								<span className="text-muted group-hover:text-red-400 text-[10px] transition-colors">Disconnect</span>
							</button>
						</div>
					) : (
						<button className="brand-button text-xs py-1.5 px-4" disabled={session.authenticating} onClick={session.connectAndAuthenticate}>
							{session.authenticating ? "Checking wallet…" : session.connected ? "Sign in with wallet" : "Connect admin wallet"}
						</button>
					)}
				</header>

				{session.error && <div className="notice error mx-8 mt-4">{session.error}</div>}

				{session.connected && session.token && session.profileLoading ? (
					<div className="app-session-loading" aria-label="Loading workspace">
						<span className="skeleton skeleton-title" />
						<span className="skeleton skeleton-copy" />
					</div>
				) : !session.token ? (
					<section className="wallet-gate">
						<span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[#4efa94]">
							<span className="size-1.5 rounded-full bg-[#4efa94]" />
							Admin Authorization
						</span>
						<h1 className="mt-3">Connect the wallet that controls your organization namespace.</h1>
						<p className="mt-4">LATCH uses a cryptographic challenge signature for admin actions. Your private key never leaves your wallet, and no gas is required to sign in.</p>
						<div className="mt-8">
							<button className="brand-button" disabled={session.authenticating} onClick={session.connectAndAuthenticate}>
								{session.authenticating ? "Waiting for signature…" : "Connect and sign in"}
							</button>
						</div>
					</section>
				) : (
					children
				)}
			</div>

			<OnboardingModal />
		</div>
	);
}
