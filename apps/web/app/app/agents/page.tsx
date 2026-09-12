"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AgentProvisioningAction } from "../../../components/agent-provisioning-action";
import { CreateAgentModal } from "../../../components/create-agent-modal";
import { useWalletSession } from "../../../components/wallet-session";
import { api, type AgentView } from "../../../lib/api";
import { PageSkeleton } from "../../../components/loading-state";

export default function AgentsPage() {
	const session = useWalletSession();
	const agents = useQuery({
		queryKey: ["agents", session.address],
		queryFn: () =>
			api<AgentView[]>("/agents", {
				headers: { authorization: `Bearer ${session.token}` },
			}),
		enabled: Boolean(session.token && session.profile?.complete),
	});
	if (agents.isPending) return <PageSkeleton cards={4} />;

	return (
		<main className="dashboard-shell app-page">
			<header className="page-heading">
				<div>
					<span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#4efa94]">
						<span className="size-1.5 rounded-full bg-[#4efa94]" />
						Identity Directory
					</span>
					<h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-5xl">AI Workers</h1>
					<p className="mt-1 text-sm text-muted">Organization-controlled ENS subname identities and their live resolved authority.</p>
				</div>
				<div className="flex items-center gap-3">
					<span className="status status-checking font-mono">{agents.data?.length ?? 0} registered</span>
					<CreateAgentModal />
				</div>
			</header>

			{agents.error && <div className="notice error">{agents.error.message}</div>}

			<section className="agents-directory">
				{agents.data?.map((agent) => (
					<article className="directory-card" key={agent.id}>
						<div className="agent-title-row">
							<div>
								<h2>{agent.displayName}</h2>
								<p>{agent.ensName}</p>
							</div>
							<span className={`status status-${agent.identity?.status ?? "unverified"}`}>{agent.identity?.status ?? "unverified"}</span>
						</div>

						<dl className="agent-facts">
							<div>
								<dt>Wallet</dt>
								<dd className="font-mono text-xs">{agent.identity?.wallet ?? agent.expectedWallet}</dd>
							</div>
							<div>
								<dt>Role</dt>
								<dd>{agent.identity?.role ?? "Not resolved"}</dd>
							</div>
							<div>
								<dt>Capabilities</dt>
								<dd>{agent.identity?.capabilities.join(", ") || "Not resolved"}</dd>
							</div>
						</dl>

						<div className="directory-actions">
							<Link className="text-link" href={`/app/agents/${encodeURIComponent(agent.ensName)}`}>
								Inspect identity →
							</Link>
							<AgentProvisioningAction agent={agent} />
						</div>
					</article>
				))}
			</section>

			<section className="worker-catalog">
				<header>
					<p className="eyebrow">Coming soon</p>
					<h2>Additional worker templates</h2>
				</header>
				<div className="coming-soon-workers">
					{["Travel Agent", "Treasury Agent", "Developer Agent"].map((name) => (
						<div key={name}><strong>{name}</strong><span>Coming soon</span></div>
					))}
				</div>
			</section>
		</main>
	);
}
