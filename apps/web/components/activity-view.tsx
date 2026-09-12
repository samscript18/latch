"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useWalletSession } from "./wallet-session";

type StageResult = "passed" | "failed" | "not_run";

interface ActivityItem {
  id: string;
  outcome: "AUTHORIZED" | "BLOCKED" | "FAILED";
  agent: string;
  task: string;
  capability: string | null;
  ensResult: StageResult;
  policyResult: StageResult;
  executionResult: StageResult;
  message: string;
  createdAt: string;
}

export function ActivityView() {
  const session = useWalletSession();
  const activity = useQuery({
    queryKey: ["activity", session.address],
    queryFn: () =>
      api<ActivityItem[]>("/activity", {
        headers: { authorization: `Bearer ${session.token}` },
      }),
    enabled: Boolean(session.token && session.profile?.complete),
    refetchInterval: 5_000,
  });

  return (
    <main className="detail-shell audit-shell app-page">
      <section className="detail-header">
        <div>
          <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#4efa94]">
            <span className="size-1.5 rounded-full bg-[#4efa94]" />
            Public Evidence Log
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
            Authorization Activity
          </h1>
          <p className="mt-1 text-sm text-muted">
            Sanitized, immutable audit records tracking which pipeline stages
            executed for each agent proposal.
          </p>
        </div>
      </section>

      {activity.error && (
        <div className="notice error">{activity.error.message}</div>
      )}

      <section className="audit-list" aria-live="polite">
        {activity.isPending && (
          <p className="font-mono text-xs text-muted">
            Fetching cryptographic authorization records…
          </p>
        )}
        {activity.data?.map((item) => (
          <article className="audit-card" key={item.id}>
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span
                className={`status ${
                  item.outcome === "AUTHORIZED"
                    ? "status-authorized"
                    : "status-blocked"
                }`}
              >
                {item.outcome}
              </span>
              <time className="font-mono text-[11px] text-muted">
                {new Date(item.createdAt).toLocaleString()}
              </time>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-foreground">
              {item.agent}
            </h2>
            <p className="mt-1 text-xs text-muted">{item.task}</p>
            <div className="mt-3">
              <code className="rounded bg-white/[0.04] px-2 py-1 font-mono text-[11px] text-muted">
                {item.capability ?? "Capability not resolved"}
              </code>
            </div>
            <dl className="audit-stages mt-5 grid grid-cols-3 gap-2 border-t border-white/5 pt-4">
              <Stage label="ENS Identity" value={item.ensResult} />
              <Stage label="Confidential Policy" value={item.policyResult} />
              <Stage label="Bazantic Execution" value={item.executionResult} />
            </dl>
          </article>
        ))}

        {activity.data?.length === 0 && (
          <div className="panel col-span-2 py-12 text-center">
            <p className="font-mono text-xs text-muted">
              No completed authorization attempts yet. Propose an action in the
              Overview console.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function Stage({ label, value }: { label: string; value: StageResult }) {
  const symbol = value === "passed" ? "✓" : value === "failed" ? "×" : "—";
  const color =
    value === "passed"
      ? "text-[#4efa94]"
      : value === "failed"
        ? "text-red-400"
        : "text-muted";
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        {label}
      </dt>
      <dd className={`mt-1 font-mono text-xs font-semibold ${color}`}>
        {symbol} {value === "not_run" ? "Not run" : value}
      </dd>
    </div>
  );
}
