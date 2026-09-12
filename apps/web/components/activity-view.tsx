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
          <p className="eyebrow">Public audit evidence</p>
          <h1>Authorization activity</h1>
          <p className="muted">
            A sanitized record of which pipeline stages ran for each action.
          </p>
        </div>
      </section>

      {activity.error && (
        <div className="notice error">{activity.error.message}</div>
      )}
      <section className="audit-list" aria-live="polite">
        {activity.isPending && <p className="muted">Loading activity…</p>}
        {activity.data?.map((item) => (
          <article className="panel audit-card" key={item.id}>
            <div className="audit-heading">
              <span className={`status status-${item.outcome.toLowerCase()}`}>
                {item.outcome}
              </span>
              <time>{new Date(item.createdAt).toLocaleString()}</time>
            </div>
            <h2>{item.agent}</h2>
            <p className="muted">{item.task}</p>
            <code>{item.capability ?? "Capability not resolved"}</code>
            <dl className="audit-stages">
              <Stage label="ENS" value={item.ensResult} />
              <Stage label="Private policy" value={item.policyResult} />
              <Stage label="Execution" value={item.executionResult} />
            </dl>
          </article>
        ))}
        {activity.data?.length === 0 && (
          <div className="panel">
            <p className="muted">No completed authorization attempts yet.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function Stage({ label, value }: { label: string; value: StageResult }) {
  const symbol = value === "passed" ? "✓" : value === "failed" ? "×" : "—";
  return (
    <div>
      <dt>{label}</dt>
      <dd className={`stage-${value}`}>
        {symbol} {value === "not_run" ? "Not run" : value}
      </dd>
    </div>
  );
}
