"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
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
    <main className="detail-shell app-page">
      <Link className="text-link" href="/app/agents">
        ← All AI workers
      </Link>
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
            <Detail
              title="Identity"
              rows={[
                ["Wallet", identity?.wallet],
                ["Organization", identity?.organization],
                ["Resolver", identity?.resolver],
              ]}
            />
            <Detail
              title="Permissions"
              rows={[
                ["Role", identity?.role],
                ["Status", identity?.status],
                ["Profile record", "Delegated only when configured"],
              ]}
            />
            <Detail
              title="Capabilities"
              rows={[
                ["Assigned", identity?.capabilities.join(", ")],
                ["Policy version", identity?.policyVersion],
                ["Private rules", "Confidential"],
              ]}
            />
          </div>
        </>
      )}
    </main>
  );
}

function Detail({
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
