"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { PageSkeleton } from "../../../components/loading-state";
import { useWalletSession } from "../../../components/wallet-session";
import { api } from "../../../lib/api";

interface TaskSummary {
  id: string;
  agentId: string;
  prompt: string;
  status: string;
  requestedCapability?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function TasksPage() {
  const session = useWalletSession();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<TaskSummary | null>(null);
  const tasks = useQuery({
    queryKey: ["tasks", session.address],
    queryFn: () => api<TaskSummary[]>("/tasks", {
      headers: { authorization: `Bearer ${session.token}` },
    }),
    enabled: Boolean(session.token && session.profile?.complete),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api<{ deleted: true; id: string }>(`/tasks/${id}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${session.token}` },
    }),
    onSuccess: async () => {
      setDeleteTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["organization"] }),
      ]);
    },
  });

  if (tasks.isPending) return <PageSkeleton cards={5} />;

  return (
    <main className="detail-shell app-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Execution ledger</p>
          <h1>Tasks</h1>
          <p className="muted">Review proposed work, authorization state, and released execution results.</p>
        </div>
        <span className="status status-checking">{tasks.data?.length ?? 0} tasks</span>
      </header>

      {tasks.error && <div className="notice error">{tasks.error.message}</div>}
      <section className="task-list">
        {tasks.data?.map((task) => {
          const agent = session.profile?.organization?.agents.find((item) => item.id === task.agentId);
          return (
            <article className="panel task-card" key={task.id}>
              <div className="task-card-heading">
                <div>
                  <p className="eyebrow">{task.requestedCapability ?? "Awaiting planning"}</p>
                  <h2>{task.prompt}</h2>
                </div>
                <span className={`status status-${task.status}`}>{task.status.replaceAll("_", " ")}</span>
              </div>
              <div className="task-meta">
                <span>{agent?.displayName ?? "AI worker"}</span>
                <span>{agent?.ensName ?? task.agentId}</span>
                <time>{formatDate(task.createdAt)}</time>
              </div>
              <div className="directory-actions">
                <Link className="text-link" href={`/app/tasks/${task.id}`}>View task →</Link>
                <button className="danger-link" onClick={() => setDeleteTarget(task)}>Delete task</button>
              </div>
            </article>
          );
        })}
        {tasks.data?.length === 0 && (
          <div className="panel empty-state">
            <h2>No tasks yet</h2>
            <p>Create and run an action from the Overview page to begin the authorization ledger.</p>
            <Link className="brand-button" href="/app">Create a task</Link>
          </div>
        )}
      </section>

      {deleteTarget && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setDeleteTarget(null)}>
          <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="delete-task-title" onMouseDown={(event) => event.stopPropagation()}>
            <p className="eyebrow danger-eyebrow">Remove task</p>
            <h2 id="delete-task-title">Delete this task from the workspace?</h2>
            <p className="muted dialog-copy">The task will disappear from organization views. Security audit evidence is retained.</p>
            {remove.error && <div className="notice error">{remove.error.message}</div>}
            <div className="dialog-actions">
              <button className="brand-button-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="button-danger" disabled={remove.isPending} onClick={() => remove.mutate(deleteTarget.id)}>
                {remove.isPending ? "Deleting…" : "Delete task"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : "Date unavailable";
}
