"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { api, type AgentView } from "../lib/api";
import { PageSkeleton } from "./loading-state";
import { useWalletSession } from "./wallet-session";

interface OrganizationView {
  name: string;
  ensName: string;
  metrics: { agentCount: number; activeTasks: number; authorizedActions: number; blockedActions: number };
  recentActivity: Array<{ _id: string; message: string; result: string; createdAt: string }>;
}

interface IntegrationStatus {
  ensv2: { state: string };
  confidentialPolicy: { state: string };
  capability: { state: string };
  research: { state: string };
}

export function OverviewDashboard() {
  const session = useWalletSession();
  const queryClient = useQueryClient();
  const [revokeTarget, setRevokeTarget] = useState<AgentView | null>(null);
  const organization = useQuery({
    queryKey: ["organization-me-dashboard", session.address, session.token],
    queryFn: async () => {
      const response = await api<{ organization: OrganizationView }>("/organization/me", { headers: { authorization: `Bearer ${session.token}` } });
      if (!response.organization) throw new Error("Complete organization setup first");
      return response.organization;
    },
    enabled: Boolean(session.token && session.profile?.complete),
  });
  const agents = useQuery({
    queryKey: ["agents", session.address],
    queryFn: () => api<AgentView[]>("/agents", { headers: { authorization: `Bearer ${session.token}` } }),
    enabled: Boolean(session.token && session.profile?.complete),
  });
  const integrations = useQuery({ queryKey: ["integrations"], queryFn: () => api<IntegrationStatus>("/integrations/status") });
  const revoke = useMutation({
    mutationFn: (agent: AgentView) => api(`/agents/${encodeURIComponent(agent.ensName)}/revoke`, { method: "POST", headers: { authorization: `Bearer ${session.token}` } }),
    onSuccess: async () => {
      setRevokeTarget(null);
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["agents"] }), queryClient.invalidateQueries({ queryKey: ["organization"] })]);
    },
  });

  if (organization.isPending || agents.isPending) return <PageSkeleton cards={6} />;
  const metrics = organization.data?.metrics;
  const loadError = organization.error ?? agents.error;

  return (
    <main className="dashboard-shell">
      <section className="dashboard-heading">
        <div><p className="eyebrow">Organization workspace</p><h1>{organization.data?.name ?? "Workspace"}</h1><p className="muted dashboard-namespace">{organization.data?.ensName ?? "ENS namespace pending configuration"}</p></div>
        <div className="integration-pills"><IntegrationPill label="ENSv2" value={integrations.data?.ensv2.state} /><IntegrationPill label="Policy" value={integrations.data?.confidentialPolicy.state} /><IntegrationPill label="Bazantic" value={integrations.data?.capability.state} /><IntegrationPill label="Research" value={integrations.data?.research.state} /></div>
      </section>
      {loadError && <div className="notice warning">API setup required: {loadError.message}</div>}
      <section className="metrics-grid" aria-label="Organization metrics"><Metric label="AI Workers" value={metrics?.agentCount ?? agents.data?.length ?? "—"} /><Metric label="Active Tasks" value={metrics?.activeTasks ?? "—"} /><Metric label="Authorized Actions" value={metrics?.authorizedActions ?? "—"} /><Metric label="Blocked Decisions" value={metrics?.blockedActions ?? "—"} /></section>

      <section className="try-now-banner">
        <div><p className="eyebrow">Authorization workspace</p><h2>Put an AI worker through the complete LATCH pipeline.</h2><p>Propose an action, verify its live ENS identity, evaluate organizational policy, and release only authorized execution.</p></div>
        <Link className="brand-button" href="/app/try">Try LATCH now <span aria-hidden="true">→</span></Link>
      </section>

      <section className="panel agent-panel overview-agent-panel">
        <div className="section-heading"><div><p className="eyebrow">Identity layer</p><h2>Registered AI workers</h2></div><Link className="text-link" href="/app/agents">Manage workers →</Link></div>
        <div className="agent-list">
          {agents.data?.map((agent) => {
            const status = agent.ensVerified ? agent.identity?.status ?? "unresolved" : "unverified";
            return <article className="agent-card" key={agent.id}><div className="agent-title-row"><div><h3>{agent.displayName}</h3><p>{agent.ensName}</p></div><span className={`status status-${status}`}>{status}</span></div><dl className="agent-facts"><Fact label="Wallet" value={shortAddress(agent.identity?.wallet)} /><Fact label="Role" value={agent.identity?.role ?? "Not verified"} /><Fact label="Capability" value={agent.identity?.capabilities.join(", ") || "None"} /></dl><div className="agent-actions"><Link className="text-link" href={`/app/agents/${encodeURIComponent(agent.ensName)}`}>Inspect identity →</Link><button className="danger-link" disabled={status === "revoked"} onClick={() => setRevokeTarget(agent)}>Revoke</button></div></article>;
          })}
        </div>
      </section>

      <section className="panel activity-panel">
        <div className="section-heading"><div><p className="eyebrow">Public evidence</p><h2>Recent authorization events</h2></div><Link className="text-link" href="/app/activity">View activity →</Link></div>
        <div className="activity-list">{organization.data?.recentActivity.length ? organization.data.recentActivity.map((item) => <div className="activity-row" key={item._id}><span className={`activity-dot activity-${item.result}`} /><span>{item.message}</span><time>{new Date(item.createdAt).toLocaleTimeString()}</time></div>) : <p className="muted empty-copy">No authorization attempts recorded yet.</p>}</div>
      </section>

      {revokeTarget && <div className="dialog-backdrop" role="presentation" onMouseDown={() => setRevokeTarget(null)}><section className="dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><p className="eyebrow danger-eyebrow">Authority revocation</p><h2>Revoke {revokeTarget.displayName}?</h2><p className="muted dialog-copy">This writes the revoked status to ENS and prevents future LATCH-authorized execution.</p>{revoke.error && <div className="notice error">{revoke.error.message}</div>}<div className="dialog-actions"><button className="brand-button-secondary" onClick={() => setRevokeTarget(null)}>Cancel</button><button className="button-danger" disabled={revoke.isPending} onClick={() => revoke.mutate(revokeTarget)}>{revoke.isPending ? "Revoking…" : "Revoke on ENSv2"}</button></div></section></div>}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) { return <article className="metric"><p>{label}</p><strong>{value}</strong></article>; }
function Fact({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function shortAddress(value?: string | null) { return value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "Not resolved"; }
function IntegrationPill({ label, value }: { label: string; value?: string }) { const active = value === "connected" || value === "configured"; return <span className={`integration-pill ${active ? "integration-configured" : ""}`}><i />{label}: {value?.replaceAll("_", " ") ?? "checking"}</span>; }
