"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../../lib/api";
import { useWalletSession, type OrganizationProfile } from "../../../components/wallet-session";

const splitList = (value: string) => [
	...new Set(
		value
			.split(/[\n,]/)
			.map((item) => item.trim())
			.filter(Boolean),
	),
];

export default function PolicySettingsPage() {
	const session = useWalletSession();
	const policy = session.profile?.organization?.policy;
	const [provider, setProvider] = useState<"manual" | "chainlink">("manual");
	const [maxSpend, setMaxSpend] = useState("2000");
	const [vendors, setVendors] = useState("demo-vendor-a, demo-vendor-b");
	const [allowedDomains, setAllowedDomains] = useState("");
	const [blockedDomains, setBlockedDomains] = useState("");
	const [maxResults, setMaxResults] = useState("10");

	useEffect(() => {
		if (!policy) return;
		setProvider(policy.provider);
		if (policy.procurement.maxAutonomousSpendCents !== undefined) {
			setMaxSpend(String(policy.procurement.maxAutonomousSpendCents / 100));
		}
		setVendors(policy.procurement.allowedVendors?.join(", ") ?? "");
		setAllowedDomains(policy.research.allowedDomains?.join(", ") ?? "");
		setBlockedDomains(policy.research.blockedDomains?.join(", ") ?? "");
		if (policy.research.maxResults !== undefined) {
			setMaxResults(String(policy.research.maxResults));
		}
	}, [policy]);

	const save = useMutation({
		mutationFn: () =>
			api<{ organization: OrganizationProfile }>("/organization/me/policy", {
				method: "PUT",
				headers: { authorization: `Bearer ${session.token}` },
				body: JSON.stringify(
					provider === "chainlink"
						? { provider }
						: {
								provider,
								procurement: {
									policyVersion: "procurement-v1",
									maxAutonomousSpendCents: Math.round(Number(maxSpend) * 100),
									allowedVendors: splitList(vendors),
								},
								research: {
									policyVersion: "research-v1",
									allowedDomains: splitList(allowedDomains),
									blockedDomains: splitList(blockedDomains),
									maxResults: Number(maxResults),
								},
							},
				),
			}),
		onSuccess: () => session.refreshProfile(),
	});

	const submit = (event: FormEvent) => {
		event.preventDefault();
		save.mutate();
	};

	return (
		<main className="detail-shell app-page">
			<header className="detail-header">
				<div>
					<p className="eyebrow">Organization controls</p>
					<h1>Policy Enforcement</h1>
					<p className="muted">Configure rules for the two capabilities LATCH currently supports.</p>
				</div>
			</header>

			<form className="policy-settings" onSubmit={submit}>
				<section className="panel policy-provider-selector">
					<h2>Enforcement provider</h2>
					<div className="agent-template-grid">
						<button type="button" className={`agent-type-option ${provider === "chainlink" ? "agent-type-option-selected" : ""}`} onClick={() => setProvider("chainlink")}>
							<strong>Chainlink Confidential</strong>
							<small>Rules remain in CRE secrets and only sanitized verdicts leave the TEE.</small>
							<code>Production</code>
						</button>
						<button type="button" className={`agent-type-option ${provider === "manual" ? "agent-type-option-selected" : ""}`} onClick={() => setProvider("manual")}>
							<strong>Manual</strong>
							<small>Organization-specific rules stored for transparency.</small>
							<code>Production</code>
						</button>
					</div>
				</section>

				{provider === "chainlink" ? (
					<section className="policy-grid">
						<PolicyStatus title="Procurement Policy" status={policy?.procurement.status ?? "Connected externally"} />
						<PolicyStatus title="Research Policy" status={policy?.research.status ?? "Connected externally"} />
						<div className="onboarding-note policy-secret-note">Secret policy values are intentionally unavailable in this interface. Configure both CRE secrets in the deployment environment.</div>
					</section>
				) : (
					<section className="policy-grid">
						<div className="panel policy-form-card">
							<p className="eyebrow">procurement.purchase</p>
							<h2>Procurement Policy</h2>
							<label>
								Maximum autonomous spend (USD)
								<input required min="0" step="0.01" type="number" value={maxSpend} onChange={(event) => setMaxSpend(event.target.value)} />
							</label>
							<label>
								Allowed vendors
								<textarea rows={3} value={vendors} onChange={(event) => setVendors(event.target.value)} />
							</label>
						</div>
						<div className="panel policy-form-card">
							<p className="eyebrow">research.search</p>
							<h2>Research Policy</h2>
							<label>
								Allowed domains
								<textarea rows={3} value={allowedDomains} onChange={(event) => setAllowedDomains(event.target.value)} placeholder="Leave empty for unrestricted domains" />
							</label>
							<label>
								Blocked domains
								<textarea rows={3} value={blockedDomains} onChange={(event) => setBlockedDomains(event.target.value)} />
							</label>
							<label>
								Maximum results
								<input required min="1" max="20" type="number" value={maxResults} onChange={(event) => setMaxResults(event.target.value)} />
							</label>
						</div>
					</section>
				)}

				{save.error && <div className="notice error">{save.error.message}</div>}
				{save.isSuccess && <div className="notice status-configured">Policy configuration saved.</div>}
				<div className="dialog-actions">
					<button className="brand-button" disabled={save.isPending}>
						{save.isPending ? "Saving Policy…" : "Save Policy"}
					</button>
				</div>
			</form>
		</main>
	);
}

function PolicyStatus({ title, status }: { title: string; status: string }) {
	return (
		<article className="panel policy-status-card">
			<div>
				<p className="eyebrow">Confidential policy</p>
				<h2>{title}</h2>
			</div>
			<span className="status status-configured">{status.replaceAll("_", " ")}</span>
		</article>
	);
}
