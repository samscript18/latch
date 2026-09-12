"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, type AgentView } from "../../../../lib/api";
import { useWalletSession } from "../../../../components/wallet-session";
import { PageSkeleton } from "../../../../components/loading-state";

export default function AgentDetailPage() {
	const params = useParams<{ ensName: string }>();
	const session = useWalletSession();
	const ensName = decodeURIComponent(params.ensName);
	const agent = useQuery({
		queryKey: ["agents", ensName],
		queryFn: () => api<AgentView>(`/agents/${encodeURIComponent(ensName)}`),
	});
	const policyProvider = session.profile?.organization?.policy.provider;
	const identity = agent.data?.identity;
	if (agent.isLoading) return <PageSkeleton cards={3} />;

	return (
		<main className="detail-shell app-page">
			<Link className="text-link inline-flex items-center gap-1.5" href="/app/agents">
				<span>←</span> All AI Workers
			</Link>

			{agent.error && <div className="notice error mt-4">{agent.error.message}</div>}

			{agent.data && (
				<>
					<header className="detail-header">
						<div>
							<span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#4efa94]">
								<span className="size-1.5 rounded-full bg-[#4efa94]" />
								AI Worker Identity
							</span>
							<h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-5xl">{agent.data.displayName}</h1>
							<p className="mt-1 font-mono text-xs text-muted">{agent.data.ensName}</p>
						</div>
						<span className={`status status-${identity?.status ?? "unverified"}`}>{identity?.status ?? "unverified"}</span>
					</header>

					<div className="rounded-xl border border-[#4efa94]/25 bg-[#4efa94]/[0.06] p-4 text-xs flex items-center justify-between mt-4">
						<div className="flex items-center gap-2 font-mono">
							<span className="size-1.5 rounded-full bg-[#4efa94]" />
							<strong className="text-foreground">{agent.data.ensVerified ? "Cryptographically verified from ENSv2 onchain registry" : "ENS onchain verification pending"}</strong>
						</div>
						<span className="font-mono text-[11px] text-muted">{identity?.checkedAtBlock ? `Block ${identity.checkedAtBlock}` : "No verified block"}</span>
					</div>

					<div className="detail-grid mt-6">
						<Detail
							title="Identity Attributes"
							rows={[
								["Wallet", identity?.wallet],
								["Namespace", identity?.organization],
								["Resolver", identity?.resolver],
							]}
						/>
						<Detail
							title="Authority & Permissions"
							rows={[
								["Role", identity?.role],
								["Status", identity?.status],
								["Profile Record", "Delegated to agent wallet"],
							]}
						/>
						<Detail
							title="Capabilities & Policy"
							rows={[
								["Assigned Capability", identity?.capabilities.join(", ")],
								["Policy Version", identity?.policyVersion],
								["Policy Provider", policyProvider === "chainlink" ? "Chainlink Confidential" : policyProvider === "manual" ? "Manual" : null],
								["Confidential Rules", "Protected inside CRE TEE"],
							]}
						/>
					</div>
				</>
			)}
		</main>
	);
}

function Detail({ title, rows }: { title: string; rows: Array<[string, string | null | undefined]> }) {
	return (
		<section className="panel detail-panel">
			<span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#4efa94]">{title}</span>
			<dl className="mt-3">
				{rows.map(([label, value]) => (
					<div key={label}>
						<dt>{label}</dt>
						<dd className="font-mono text-xs text-foreground/90">{value || "Unavailable"}</dd>
					</div>
				))}
			</dl>
		</section>
	);
}
