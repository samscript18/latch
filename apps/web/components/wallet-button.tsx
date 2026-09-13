"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useConnect, useSwitchChain } from "wagmi";
import { hackathonSepolia } from "../lib/wagmi";
import { useWalletSession } from "./wallet-session";

function shortAddress(value: string): string {
	return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function WalletButton() {
	const [copied, setCopied] = useState(false);
	const [menuError, setMenuError] = useState<string | null>(null);
	const [chooserOpen, setChooserOpen] = useState(false);
	const { address, chainId, isConnected } = useAccount();
	const { connectors, connectAsync, error: connectError, isPending: isConnecting } = useConnect();
	const { switchChain, isPending: isSwitching, error: switchError } = useSwitchChain();
	const session = useWalletSession();
	const availableConnectors = useMemo(() => connectors.filter((connector, index, all) => all.findIndex((candidate) => candidate.name === connector.name) === index), [connectors]);

	useEffect(() => {
		if (!chooserOpen) return;
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") setChooserOpen(false);
		};
		document.addEventListener("keydown", closeOnEscape);
		return () => document.removeEventListener("keydown", closeOnEscape);
	}, [chooserOpen]);

	if (isConnected && chainId !== hackathonSepolia.id) {
		return (
			<div className="relative">
				<button
					type="button"
					className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#f5f5f5] px-4 py-2 text-xs font-medium text-[#050505] transition-all duration-200 ease-out hover:bg-white active:scale-[0.98] disabled:opacity-40"
					onClick={() => switchChain({ chainId: hackathonSepolia.id })}
					disabled={isSwitching}
				>
					{isSwitching ? (
						"Switching…"
					) : (
						<>
							<span className="sm:hidden">Switch network</span>
							<span className="hidden sm:inline">Switch to Sepolia</span>
						</>
					)}
				</button>
				{switchError ? <p className="wallet-inline-error">{switchError.message}</p> : null}
			</div>
		);
	}

	if (!isConnected) {
		return (
			<>
				<button
					type="button"
					onClick={() => setChooserOpen(true)}
					className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#f5f5f5] px-4 py-2 text-sm font-medium text-[#050505] transition-all duration-200 ease-out hover:bg-white active:scale-[0.98] disabled:opacity-40"
				>
					<span className="wallet-glyph" aria-hidden="true">
						◇
					</span>
					Connect wallet
				</button>
				{chooserOpen ? (
					<div
						className="wallet-modal-backdrop"
						role="presentation"
						onMouseDown={(event) => {
							if (event.target === event.currentTarget) setChooserOpen(false);
						}}
					>
						<section className="wallet-modal" role="dialog" aria-modal="true" aria-labelledby="wallet-modal-title">
							<button type="button" className="wallet-modal-close" aria-label="Close wallet chooser" onClick={() => setChooserOpen(false)}>
								×
							</button>
							<div className="wallet-modal-intro">
								<span className="wallet-modal-mark" aria-hidden="true">
									✓
								</span>
								<div>
									<p className="wallet-modal-eyebrow">Admin authorization</p>
									<h2 id="wallet-modal-title">Connect your wallet</h2>
									<p>Choose the wallet that controls your organization. LATCH will request a separate message signature after connection.</p>
								</div>
								<div className="wallet-modal-assurance">
									<span>No gas required</span>
									<span>Keys remain in your wallet</span>
									<span>Short-lived admin session</span>
								</div>
							</div>
							<div className="wallet-modal-options">
								<div>
									<p className="wallet-modal-eyebrow">Available wallets</p>
									<h3>Select a wallet</h3>
								</div>
								<div className="wallet-option-list">
									{availableConnectors.map((connector) => (
										<button
											type="button"
											className="wallet-option"
											key={connector.uid}
											disabled={isConnecting}
											onClick={() => {
												void connectAsync({ connector, chainId: hackathonSepolia.id })
													.then(() => setChooserOpen(false))
													.catch(() => undefined);
											}}
										>
											<span className="wallet-option-icon">
												{connector.icon ? (
													<span className="wallet-option-image" style={{ backgroundImage: `url(${connector.icon})` }} />
												) : (
													<span className="wallet-glyph" aria-hidden="true">
														◇
													</span>
												)}
											</span>
											<span>
												<strong>{connector.name}</strong>
												<small>Browser or installed wallet</small>
											</span>
											<span aria-hidden="true">→</span>
										</button>
									))}
								</div>
								{!availableConnectors.length ? <p className="wallet-modal-empty">No compatible wallet provider was detected.</p> : null}
								{connectError ? <p className="wallet-modal-error">{connectError.message}</p> : null}
								<p className="wallet-modal-footnote">New to Ethereum wallets? Install MetaMask, Rabby, Coinbase Wallet, or another EIP-6963 compatible wallet.</p>
							</div>
						</section>
					</div>
				) : null}
			</>
		);
	}

	if (!session.token) {
		return (
			<button
				type="button"
				onClick={() => void session.authenticateConnectedWallet()}
				disabled={session.authenticating}
				className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#4efa94] px-4 py-2 text-sm font-medium text-[#041a0e] transition-all duration-200 ease-out hover:bg-[#4efa94]/90 active:scale-[0.98] disabled:opacity-40"
			>
				<span className="wallet-glyph" aria-hidden="true">
					◇
				</span>
				{session.authenticating ? "Check wallet…" : "Sign in with wallet"}
			</button>
		);
	}

	return (
		<details
			className="group relative"
			onKeyDown={(event) => {
				if (event.key === "Escape") {
					event.currentTarget.open = false;
					event.currentTarget.querySelector("summary")?.focus();
				}
			}}
		>
			<summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-full border border-white/5 bg-white/[0.02] px-3 text-[12px] font-medium transition-colors hover:border-white/10 hover:bg-white/[0.05] [&::-webkit-details-marker]:hidden">
				<span className="wallet-avatar size-5 shrink-0" aria-hidden="true" />
				<span className="max-w-32 truncate font-mono text-[11px] text-foreground/90">{address ? shortAddress(address) : "Connected"}</span>
				<span className="hidden rounded-sm border border-white/10 bg-white/[0.03] px-1 py-0.5 font-mono text-[8px] uppercase tracking-[0.14em] text-muted sm:inline">Sepolia</span>
				<span className="wallet-chevron" aria-hidden="true">
					⌄
				</span>
			</summary>
			<div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-white/10 bg-[#0f1012] p-1.5 shadow-2xl backdrop-blur-md">
				<Link href="/app/settings" className="wallet-menu-item">
					<span className="wallet-menu-glyph" aria-hidden="true">
						⚙
					</span>
					Workspace settings
				</Link>
				<button
					type="button"
					className="wallet-menu-item w-full"
					onClick={() => {
						if (!address) return;
						void navigator.clipboard
							.writeText(address)
							.then(() => setCopied(true))
							.catch(() => setMenuError("Address could not be copied. Please try again."));
					}}
				>
					<span className="wallet-menu-glyph" aria-hidden="true">
						⧉
					</span>
					{copied ? "Address copied" : "Copy address"}
				</button>
				<a href={`${hackathonSepolia.blockExplorers.default.url}/address/${address}`} target="_blank" rel="noreferrer" className="wallet-menu-item">
					<span className="wallet-menu-glyph" aria-hidden="true">
						↗
					</span>
					View on explorer
				</a>
				<div className="my-1 border-t border-white/5" />
				<button type="button" className="wallet-menu-item wallet-menu-danger w-full" onClick={session.disconnectWallet}>
					<span className="wallet-menu-glyph" aria-hidden="true">
						↪
					</span>
					Disconnect
				</button>
				{menuError ? <p className="wallet-menu-error">{menuError}</p> : null}
			</div>
		</details>
	);
}
