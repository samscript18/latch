"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "../lib/api";

interface IntegrationStatus {
  ensv2: {
    state: string;
    network: string;
    checkedName: string | null;
    lastSuccessfulResolution: string | null;
  };
  confidentialPolicy: {
    provider: string;
    state: string;
    environment: string | null;
    lastSuccessfulSimulation: string | null;
    validForHackathon: boolean;
  };
  capability: {
    provider: string;
    state: string;
    gateway: string | null;
    recipeId: string | null;
    lastSuccessfulInvocation: string | null;
    validForHackathon: boolean;
  };
  planner: { provider: string; state: string; validForHackathon: boolean };
  database: { provider: string; state: string };
  auditContract: { network: string; state: string; address: string | null };
}

export function IntegrationsView() {
  const status = useQuery({
    queryKey: ["integrations"],
    queryFn: () => api<IntegrationStatus>("/integrations/status"),
    refetchInterval: 15_000,
  });

  return (
    <main className="detail-shell integration-shell">
      <header className="topbar">
        <Link className="wordmark" href="/">
          LATCH
        </Link>
        <nav className="demo-nav" aria-label="Demo navigation">
          <Link href="/demo">Workspace</Link>
          <Link href="/demo/activity">Activity</Link>
          <Link aria-current="page" href="/demo/integrations">
            Integrations
          </Link>
        </nav>
      </header>
      <section className="detail-header">
        <div>
          <p className="eyebrow">Runtime readiness</p>
          <h1>Integration status</h1>
          <p className="muted">
            Connected means a live check succeeded. Configured means credentials
            and endpoints are present but no success is being claimed.
          </p>
        </div>
      </section>
      {status.error && (
        <div className="notice error">{status.error.message}</div>
      )}
      <section className="integration-grid">
        <StatusCard
          name="ENSv2"
          state={status.data?.ensv2.state}
          facts={[
            ["Network", status.data?.ensv2.network],
            ["Checked name", status.data?.ensv2.checkedName],
            ["Last resolution", status.data?.ensv2.lastSuccessfulResolution],
          ]}
        />
        <StatusCard
          name="Chainlink CRE"
          state={status.data?.confidentialPolicy.state}
          facts={[
            ["Provider", status.data?.confidentialPolicy.provider],
            ["Environment", status.data?.confidentialPolicy.environment],
            [
              "Last confidential simulation",
              status.data?.confidentialPolicy.lastSuccessfulSimulation,
            ],
            [
              "Hackathon evidence",
              evidenceLabel(status.data?.confidentialPolicy.validForHackathon),
            ],
          ]}
        />
        <StatusCard
          name="Bazantic"
          state={status.data?.capability.state}
          facts={[
            ["Gateway", status.data?.capability.gateway],
            ["Recipe", status.data?.capability.recipeId],
            [
              "Last invocation",
              status.data?.capability.lastSuccessfulInvocation,
            ],
            [
              "Hackathon evidence",
              evidenceLabel(status.data?.capability.validForHackathon),
            ],
          ]}
        />
        <StatusCard
          name="MongoDB"
          state={status.data?.database.state}
          facts={[["Provider", status.data?.database.provider]]}
        />
        <StatusCard
          name="Audit contract"
          state={status.data?.auditContract.state}
          facts={[
            ["Network", status.data?.auditContract.network],
            ["Address", status.data?.auditContract.address],
          ]}
        />
        <StatusCard
          name="Task planner"
          state={status.data?.planner.state}
          facts={[
            ["Provider", status.data?.planner.provider],
            [
              "Hackathon evidence",
              evidenceLabel(status.data?.planner.validForHackathon),
            ],
          ]}
        />
      </section>
    </main>
  );
}

function StatusCard({
  name,
  state,
  facts,
}: {
  name: string;
  state?: string;
  facts: Array<[string, string | null | undefined]>;
}) {
  return (
    <article className="panel integration-card">
      <div className="integration-card-heading">
        <h2>{name}</h2>
        <span className={`status status-${state ?? "checking"}`}>
          {state?.replaceAll("_", " ") ?? "checking"}
        </span>
      </div>
      <dl>
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{formatValue(value)}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function formatValue(value: string | null | undefined) {
  if (!value) return "Not available";
  if (/^\d{4}-\d{2}-\d{2}T/.test(value))
    return new Date(value).toLocaleString();
  return value;
}

function evidenceLabel(value: boolean | undefined) {
  if (value === undefined) return undefined;
  return value ? "Configured for live demo" : "Not valid for hackathon demo";
}
