"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api, type AgentView } from "../../../../lib/api";

export default function AgentDetailPage() {
  const params = useParams<{ ensName: string }>();
  const ensName = decodeURIComponent(params.ensName);
  const agent = useQuery({
    queryKey: ["agents", ensName],
    queryFn: () => api<AgentView>(`/agents/${encodeURIComponent(ensName)}`),
  });
  const identity = agent.data?.identity;
  return (
    <main className="detail-shell">
      <a className="text-link" href="/demo">
        ← Authorization console
      </a>
      {agent.isLoading && (
        <p className="muted detail-loading">Resolving fresh ENS records…</p>
      )}
      {agent.error && <div className="notice error">{agent.error.message}</div>}
      {agent.data && (
        <>
          <header className="detail-header">
            <div>
              <p className="eyebrow">AI worker identity</p>
              <h1>{agent.data.displayName}</h1>
              <p className="muted">{agent.data.ensName}</p>
            </div>
            <span
              className={`status status-${identity?.status ?? "unverified"}`}
            >
              {identity?.status ?? "unverified"}
            </span>
          </header>
          <div className="verified-banner">
            <strong>
              {agent.data.ensVerified
                ? "Verified from ENSv2"
                : "ENS verification unavailable"}
            </strong>
            <span>
              {identity?.checkedAtBlock
                ? `Block ${identity.checkedAtBlock}`
                : "No verified block"}
            </span>
          </div>
          <div className="detail-grid">
            <DetailSection
              title="Identity"
              rows={[
                ["Wallet", identity?.wallet],
                ["Organization", identity?.organization],
                ["Resolver", identity?.resolver],
              ]}
            />
            <DetailSection
              title="Permissions"
              rows={[
                ["Role", identity?.role],
                ["Status", identity?.status],
                ["Agent profile", "Delegated safe record only"],
              ]}
            />
            <DetailSection
              title="Capabilities"
              rows={[
                ["Assigned", identity?.capabilities.join(", ")],
                ["Policy version", identity?.policyVersion],
                ["Private rules", "Hidden"],
              ]}
            />
          </div>
          <section className="panel activity-panel">
            <p className="eyebrow">Recent activity</p>
            <h2>Agent authorization history</h2>
            <div className="activity-list">
              {agent.data.recentActivity.length ? (
                agent.data.recentActivity.map((item) => (
                  <div className="activity-row" key={item.id}>
                    <span className={`activity-dot activity-${item.result}`} />
                    <span>{item.message}</span>
                    <time>{new Date(item.createdAt).toLocaleString()}</time>
                  </div>
                ))
              ) : (
                <p className="muted">No activity recorded for this agent.</p>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function DetailSection({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string | null | undefined]>;
}) {
  return (
    <section className="panel detail-panel">
      <p className="eyebrow">{title}</p>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value || "Unavailable"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
