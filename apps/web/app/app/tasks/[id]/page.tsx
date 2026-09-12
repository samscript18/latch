"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { PageSkeleton } from "../../../../components/loading-state";
import { useWalletSession } from "../../../../components/wallet-session";
import { api } from "../../../../lib/api";

interface TaskSummary {
  id: string;
  agentId: string;
  prompt: string;
  status: string;
  requestedCapability?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface TaskDetail {
  task: TaskSummary & { organizationId: string; actionVersion: number };
  action: null | Record<string, unknown>;
  succeeded: boolean;
  code?: string;
}

interface TaskActivity {
  _id: string;
  type: string;
  result: string;
  message: string;
  publicMetadata?: Record<string, unknown>;
  createdAt: string;
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const session = useWalletSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const task = useQuery({
    queryKey: ["task", id],
    queryFn: () => api<TaskDetail>(`/tasks/${id}`, { headers: { authorization: `Bearer ${session.token}` } }),
    enabled: Boolean(session.token && id),
  });
  const activity = useQuery({
    queryKey: ["task-activity", id],
    queryFn: () => api<TaskActivity[]>(`/tasks/${id}/activity`, { headers: { authorization: `Bearer ${session.token}` } }),
    enabled: Boolean(session.token && id),
  });
  const remove = useMutation({
    mutationFn: () => api(`/tasks/${id}`, { method: "DELETE", headers: { authorization: `Bearer ${session.token}` } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      router.replace("/app/tasks");
    },
  });

  if (task.isPending || activity.isPending) return <PageSkeleton cards={4} />;
  if (task.error) return <main className="detail-shell app-page"><div className="notice error">{task.error.message}</div></main>;
  if (!task.data) return null;

  const agent = session.profile?.organization?.agents.find((item) => item.id === task.data.task.agentId);
  const actionEntries = Object.entries(task.data.action ?? {}).filter(([key, value]) => key !== "results" && value !== undefined && value !== null);
  const results = readResearchResults(task.data.action?.results);

  return (
    <main className="detail-shell app-page">
      <header className="detail-header">
        <div>
          <Link className="back-link" href="/app/tasks">← All tasks</Link>
          <p className="eyebrow">Task {task.data.task.id.slice(-8)}</p>
          <h1>{task.data.task.prompt}</h1>
          <p className="muted">{agent?.displayName ?? "AI worker"} · {agent?.ensName ?? task.data.task.agentId}</p>
        </div>
        <span className={`status status-${task.data.task.status}`}>{task.data.task.status.replaceAll("_", " ")}</span>
      </header>

      <section className="task-detail-grid">
        <article className="panel detail-panel">
          <h2>Task information</h2>
          <dl>
            <Fact label="Capability" value={task.data.task.requestedCapability ?? "Not resolved"} />
            <Fact label="Action version" value={String(task.data.task.actionVersion)} />
            <Fact label="Created" value={formatDate(task.data.task.createdAt)} />
            <Fact label="Updated" value={formatDate(task.data.task.updatedAt)} />
            <Fact label="Result" value={task.data.succeeded ? "Succeeded" : task.data.code ?? "Pending"} />
          </dl>
        </article>
        <article className="panel detail-panel">
          <h2>Authorized action</h2>
          {actionEntries.length ? (
            <dl>{actionEntries.map(([key, value]) => <Fact key={key} label={humanize(key)} value={formatValue(value)} />)}</dl>
          ) : <p className="muted">No action has been constructed yet.</p>}
        </article>
      </section>

      {results.length > 0 && (
        <section className="panel task-timeline">
          <div className="section-heading"><div><p className="eyebrow">Execution output</p><h2>Research results</h2></div></div>
          <div className="research-result-summary">
            {results.map((result) => <a href={result.url} key={result.url} rel="noreferrer" target="_blank"><strong>{result.title}</strong><span>{result.content}</span><code>{result.url}</code></a>)}
          </div>
        </section>
      )}

      <section className="panel task-timeline">
        <div className="section-heading"><div><p className="eyebrow">Authorization trail</p><h2>Task activity</h2></div></div>
        {activity.error && <div className="notice error">{activity.error.message}</div>}
        <div className="timeline-list">
          {activity.data?.map((item) => (
            <article className="timeline-item" key={item._id}>
              <span className={`activity-dot activity-${item.result}`} />
              <div><strong>{humanize(item.type)}</strong><p>{item.message}</p></div>
              <time>{formatDate(item.createdAt)}</time>
            </article>
          ))}
        </div>
      </section>

      <div className="task-danger-zone">
        <div><strong>Remove task</strong><p>Hide this task while retaining its security audit evidence.</p></div>
        <button className="button-danger" onClick={() => setConfirmingDelete(true)}>Delete task</button>
      </div>

      {confirmingDelete && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setConfirmingDelete(false)}>
          <section className="dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <p className="eyebrow danger-eyebrow">Remove task</p><h2>Delete this task?</h2>
            <p className="muted dialog-copy">This removes it from your organization workspace but retains authorization evidence.</p>
            {remove.error && <div className="notice error">{remove.error.message}</div>}
            <div className="dialog-actions"><button className="brand-button-secondary" onClick={() => setConfirmingDelete(false)}>Cancel</button><button className="button-danger" disabled={remove.isPending} onClick={() => remove.mutate()}>{remove.isPending ? "Deleting…" : "Delete task"}</button></div>
          </section>
        </div>
      )}
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function formatDate(value?: string) { return value ? new Date(value).toLocaleString() : "Unavailable"; }
function humanize(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function formatValue(value: unknown) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "None";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
function readResearchResults(value: unknown): Array<{ title: string; url: string; content: string }> {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is { title: string; url: string; content: string } => {
    if (!item || typeof item !== "object") return false;
    const result = item as Record<string, unknown>;
    return typeof result.title === "string" && typeof result.url === "string" && typeof result.content === "string";
  });
}
