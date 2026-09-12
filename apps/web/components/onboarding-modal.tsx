"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useWalletSession, type OrganizationProfile } from "./wallet-session";

interface AgentInput {
	ensName: string;
	wallet: string;
	type: "procurement" | "research";
}

const agentTemplates = {
	procurement: {
		name: "Procurement Agent",
		description: "Source products and request authorized purchases.",
		capability: "procurement.purchase",
	},
	research: {
		name: "Research Agent",
		description: "Perform authorized web research using approved research tools.",
		capability: "research.search",
	},
} as const;

const emptyAgent = (): AgentInput => ({
	ensName: "",
	wallet: "",
	type: "procurement",
});

export function OnboardingModal() {
	const session = useWalletSession();
	const existing = session.profile?.organization;
	const isExistingWorkspace = session.profile?.exists === true;
	const [name, setName] = useState("");
	const [ensName, setEnsName] = useState("");
	const [industry, setIndustry] = useState("");
	const [website, setWebsite] = useState("");
	const [agents, setAgents] = useState<AgentInput[]>([emptyAgent()]);
	const [hydratedWallet, setHydratedWallet] = useState<string | null>(null);

	useEffect(() => {
		if (!session.address || session.profile === undefined) return;
		if (existing) {
			setName(existing.name ?? "");
			setEnsName(existing.ensName ?? "");
			setIndustry(existing.industry ?? "");
			setWebsite(existing.website ?? "");
			setAgents(
				existing.agents.length
					? existing.agents.map((agent) => ({
							ensName: agent.ensName,
							wallet: agent.wallet,
							type:
								agent.type === "research" || agent.role === "research"
									? "research"
									: "procurement",
						}))
					: [emptyAgent()],
			);
		} else {
			setName("");
			setEnsName("");
			setIndustry("");
			setWebsite("");
			setAgents([emptyAgent()]);
		}
		setHydratedWallet(session.address.toLowerCase());
	}, [existing, session.address, session.profile]);

	const save = useMutation({
		mutationFn: () =>
			api<{ organization: OrganizationProfile }>("/organization/me", {
				method: isExistingWorkspace ? "PUT" : "POST",
				headers: { authorization: `Bearer ${session.token}` },
				body: JSON.stringify({
					name,
					ensName,
					industry,
					website,
					agents: agents.map((agent) => ({
						ensName: agent.ensName,
						wallet: agent.wallet,
						type: agent.type,
					})),
				}),
			}),
		onSuccess: () => session.refreshProfile(),
	});

	const profileHydrated =
		Boolean(session.address) &&
		hydratedWallet === session.address?.toLowerCase();

	if (
		!session.connected ||
		!session.token ||
		session.profileLoading ||
		session.profile === undefined ||
		!profileHydrated ||
		session.profile.complete
	) {
		return null;
	}

	const submit = (event: FormEvent) => {
		event.preventDefault();
		save.mutate();
	};

	const updateAgent = <K extends keyof AgentInput>(index: number, field: K, value: AgentInput[K]) => {
		setAgents((current) => current.map((agent, position) => (position === index ? { ...agent, [field]: value } : agent)));
	};

	return (
		<div className="dialog-backdrop">
			<section className="onboarding-dialog" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
				<header className="onboarding-header">
					<div>
						<span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#4efa94]">
							<span className="size-1.5 rounded-full bg-[#4efa94]" />
							{isExistingWorkspace ? "Workspace Update" : "Organization Setup"}
						</span>
						<h2 id="onboarding-title" className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
							{isExistingWorkspace ? "Complete your LATCH Workspace" : "Establish your LATCH Workspace"}
						</h2>
						<p className="mt-2 text-xs text-muted leading-relaxed">
							{isExistingWorkspace
								? "Review the information already linked to this admin wallet and complete any missing organization or agent details."
								: "Connect your company namespace to the autonomous workers whose authority LATCH will verify. Saving this profile links your workspace to ENS records."}
						</p>
					</div>
					<span className="setup-step">Required Setup</span>
				</header>

				<form onSubmit={submit}>
					<fieldset>
						<legend className="text-sm font-semibold text-foreground">Company Identity</legend>
						<div className="form-grid">
							<label>
								Organization Name
								<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" />
							</label>
							<label>
								Industry
								<input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Technology / Finance" />
							</label>
							<label>
								Organization ENS Namespace
								<input required value={ensName} onChange={(e) => setEnsName(e.target.value)} placeholder="company.eth" />
							</label>
							<label>
								Website
								<input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://company.com" />
							</label>
							<label className="full-field">
								Connected Admin Wallet
								<input readOnly value={session.address ?? ""} />
							</label>
						</div>
					</fieldset>

					<fieldset>
						<div className="fieldset-heading">
							<legend className="text-sm font-semibold text-foreground">AI Workers to Authorize</legend>
							<button
								type="button"
								className="text-link"
								onClick={() =>
									setAgents((items) => [
										...items,
										emptyAgent(),
									])
								}
							>
								+ Add Agent
							</button>
						</div>
						<p className="field-help">Each ENS identity must be a subname of the organization namespace. ENS remains authoritative for role, status, and capabilities.</p>

						<div className="agent-input-list">
							{agents.map((agent, index) => (
								<div className="agent-input-row" key={index}>
									<div className="agent-input-heading">
										<span>Agent {String(index + 1).padStart(2, "0")}</span>
										{agents.length > 1 && (
											<button
												type="button"
												className="agent-remove-button"
												onClick={() => setAgents((items) => items.filter((_, position) => position !== index))}
												aria-label={`Remove ${agentTemplates[agent.type].name}`}
											>
												<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
													<path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6m-8 4h10m-9 0 .7 13h6.6L16 7M10 10v7m4-7v7" />
												</svg>
												<span>Remove agent</span>
											</button>
										)}
									</div>
									<div className="agent-type-field">
										<span className="agent-type-label">Agent type</span>
										<div className="agent-type-options">
											{Object.entries(agentTemplates).map(([type, template]) => (
												<button
													type="button"
													className={`agent-type-option ${agent.type === type ? "agent-type-option-selected" : ""}`}
													onClick={() => updateAgent(index, "type", type as AgentInput["type"])}
													aria-pressed={agent.type === type}
													key={type}
												>
													<strong>{template.name}</strong>
													<small>{template.description}</small>
													<code>{template.capability}</code>
												</button>
											))}
										</div>
									</div>
									<label>
										Agent ENS Subname
										<input
											required
											value={agent.ensName}
											onChange={(e) => updateAgent(index, "ensName", e.target.value)}
											placeholder={`${agent.type}.${ensName || "company.eth"}`}
										/>
									</label>
									<label>
										Agent Wallet
										<input required value={agent.wallet} onChange={(e) => updateAgent(index, "wallet", e.target.value)} placeholder="0x…" />
									</label>
								</div>
							))}
						</div>
					</fieldset>

					<div className="onboarding-note">
						After setup, LATCH verifies these identities directly from the ENSv2 Sepolia deployment. Missing onchain records remain visibly unverified and cannot authorize actions.
					</div>

					{save.error && <div className="notice error mt-4">{save.error.message}</div>}

					<footer className="dialog-actions mt-8">
						<button type="button" className="brand-button-secondary text-xs" onClick={session.disconnectWallet}>
							Use Another Wallet
						</button>
						<button className="brand-button" disabled={save.isPending}>
							<span>
								{save.isPending
									? isExistingWorkspace
										? "Updating Workspace…"
										: "Creating Workspace…"
									: isExistingWorkspace
										? "Update Workspace"
										: "Create Workspace"}
							</span>
							<svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7V17" />
							</svg>
						</button>
					</footer>
				</form>
			</section>
		</div>
	);
}
