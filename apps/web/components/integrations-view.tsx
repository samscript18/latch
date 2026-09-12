"use client";

import { useQuery } from "@tanstack/react-query";
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
  research: {
    provider: string;
    state: string;
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
    <main className="detail-shell integration-shell app-page">
      <section className="detail-header">
        <div>
          <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#4efa94]">
            <span className="size-1.5 rounded-full bg-[#4efa94]" />
            Runtime Readiness
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
            Integration Status
          </h1>
          <p className="mt-1 text-sm text-muted">
            Live health verification of all external protocol integrations
            powering the LATCH decision engine.
          </p>
        </div>
      </section>

      {status.error && (
        <div className="notice error">{status.error.message}</div>
      )}

      <section className="integration-grid">
        <StatusCard
          name="ENSv2 Identity"
          state={status.data?.ensv2.state}
          facts={[
            ["Network", status.data?.ensv2.network],
            ["Checked name", status.data?.ensv2.checkedName],
            ["Last resolution", status.data?.ensv2.lastSuccessfulResolution],
          ]}
        />
        <StatusCard
          name="Chainlink CRE (Confidential)"
          state={status.data?.confidentialPolicy.state}
          facts={[
            ["Provider", status.data?.confidentialPolicy.provider],
            ["Environment", status.data?.confidentialPolicy.environment],
            [
              "Last simulation",
              status.data?.confidentialPolicy.lastSuccessfulSimulation,
            ],
            [
              "Demo readiness",
              evidenceLabel(status.data?.confidentialPolicy.validForHackathon),
            ],
          ]}
        />
        <StatusCard
          name="Bazantic Capabilities"
          state={status.data?.capability.state}
          facts={[
            ["Gateway", status.data?.capability.gateway],
            ["Recipe", status.data?.capability.recipeId],
            [
              "Last invocation",
              status.data?.capability.lastSuccessfulInvocation,
            ],
            [
              "Demo readiness",
              evidenceLabel(status.data?.capability.validForHackathon),
            ],
          ]}
        />
        <StatusCard
          name="Tavily Research"
          state={status.data?.research.state}
          facts={[
            ["Provider", status.data?.research.provider],
            ["Last invocation", status.data?.research.lastSuccessfulInvocation],
            ["Demo readiness", evidenceLabel(status.data?.research.validForHackathon)],
          ]}
        />
        <StatusCard
          name="State Database"
          state={status.data?.database.state}
          facts={[["Provider", status.data?.database.provider]]}
        />
        <StatusCard
          name="Audit Evidence"
          state={status.data?.auditContract.state}
          facts={[
            ["Network", status.data?.auditContract.network],
            ["Contract", status.data?.auditContract.address],
          ]}
        />
        <StatusCard
          name="Task Planner"
          state={status.data?.planner.state}
          facts={[
            ["Provider", status.data?.planner.provider],
            [
              "Demo readiness",
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
  const isConnected = state === "connected" || state === "configured";
  return (
    <article className="integration-card">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h2 className="text-base font-semibold text-foreground">{name}</h2>
        <span
          className={`status ${
            isConnected ? "status-connected" : "status-checking"
          }`}
        >
          {state?.replaceAll("_", " ") ?? "checking"}
        </span>
      </div>
      <dl className="mt-4 space-y-2">
        {facts.map(([label, value]) => (
          <div className="flex items-center justify-between py-1" key={label}>
            <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              {label}
            </dt>
            <dd className="font-mono text-xs text-foreground/90">
              {formatValue(value)}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function formatValue(value: string | null | undefined) {
  if (!value) return "Not available";
  if (/^\d{4}-\d{2}-\d{2}T/.test(value))
    return new Date(value).toLocaleTimeString();
  return value;
}

function evidenceLabel(value: boolean | undefined) {
  if (value === undefined) return undefined;
  return value ? "Configured for live demo" : "Not valid for hackathon demo";
}
