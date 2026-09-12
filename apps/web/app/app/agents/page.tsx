"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api, type AgentView } from "../../../lib/api";
import { useWalletSession } from "../../../components/wallet-session";

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
  return (
    <main className="dashboard-shell app-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Identity directory</p>
          <h1>AI workers</h1>
          <p>
            Organization-controlled ENS identities and their currently resolved
            authority.
          </p>
        </div>
        <span className="status">{agents.data?.length ?? 0} registered</span>
      </header>
      {agents.error && (
        <div className="notice error">{agents.error.message}</div>
      )}
      <section className="agents-directory">
        {agents.data?.map((agent) => (
          <article className="panel directory-card" key={agent.id}>
            <div className="agent-title-row">
              <div>
                <h2>{agent.displayName}</h2>
                <p>{agent.ensName}</p>
              </div>
              <span
                className={`status status-${agent.identity?.status ?? "unverified"}`}
              >
                {agent.identity?.status ?? "unverified"}
              </span>
            </div>
            <dl className="agent-facts">
              <div>
                <dt>Wallet</dt>
                <dd>{agent.identity?.wallet ?? agent.expectedWallet}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{agent.identity?.role ?? "Not resolved"}</dd>
              </div>
              <div>
                <dt>Capabilities</dt>
                <dd>
                  {agent.identity?.capabilities.join(", ") || "Not resolved"}
                </dd>
              </div>
            </dl>
            <Link
              className="text-link"
              href={`/app/agents/${encodeURIComponent(agent.ensName)}`}
            >
              Inspect verified identity →
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
