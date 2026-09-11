"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "../lib/api";

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
  const activity = useQuery({
    queryKey: ["activity"],
    queryFn: () => api<ActivityItem[]>("/activity"),
    refetchInterval: 5_000,
  });

  return (
    <main className="detail-shell audit-shell">
      <header className="topbar">
        <Link className="wordmark" href="/">
          LATCH
        </Link>
        <nav className="demo-nav" aria-label="Demo navigation">
          <Link href="/demo">Workspace</Link>
          <Link aria-current="page" href="/demo/activity">
            Activity
          </Link>
          <Link href="/demo/integrations">Integrations</Link>
        </nav>
      </header>
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
