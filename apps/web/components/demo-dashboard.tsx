"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api, type AgentView } from "../lib/api";
import { PageSkeleton } from "./loading-state";
import { useWalletSession } from "./wallet-session";

interface OrganizationView {
  name: string;
  ensName: string;
  metrics: {
    agentCount: number;
    activeTasks: number;
    authorizedActions: number;
    blockedActions: number;
  };
  recentActivity: Array<{
    _id: string;
    message: string;
    result: string;
    createdAt: string;
  }>;
}

interface TaskView {
  id: string;
  prompt: string;
  status: string;
  requestedCapability?: string;
}

interface IntegrationStatus {
  ensv2: { state: string };
  confidentialPolicy: { provider: string; state: string };
  capability: { provider: string; state: string };
  research: { provider: string; state: string };
}

interface ProcurementRunAction {
  actionType: "procurement.purchase";
  item: string;
  quantity: number;
  amountCents: number;
  ensAuthorized: boolean;
  policyAuthorized: boolean;
}

interface ResearchRunAction {
  actionType: "research.search";
  query: string;
  domains: string[];
  maxResults: number;
  ensAuthorized: boolean;
  policyAuthorized: boolean;
  executionReference?: string;
  results: Array<{ title: string; url: string; content: string; score?: number }>;
}

interface RunResult {
  task: TaskView;
  action: null | ProcurementRunAction | ResearchRunAction;
  succeeded: boolean;
  code?: string;
}

interface TaskActivity {
  _id: string;
  type: string;
  result: "started" | "authorized" | "blocked" | "failed" | "succeeded";
  message: string;
  createdAt: string;
}

const shortAddress = (value: string | null | undefined) =>
  value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "Not resolved";

export function DemoDashboard() {
  const queryClient = useQueryClient();
  const session = useWalletSession();
  const [prompt, setPrompt] = useState("Buy 20 monitors for our new office");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<AgentView | null>(null);
  const [lastResult, setLastResult] = useState<RunResult | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const organization = useQuery({
    queryKey: ["organization-me-dashboard", session.address, session.token],
    queryFn: async () => {
      const response = await api<{ organization: OrganizationView }>(
        "/organization/me",
        {
          headers: { authorization: `Bearer ${session.token}` },
        },
      );
      if (!response.organization)
        throw new Error("Complete organization setup first");
      return response.organization;
    },
    enabled: Boolean(session.token && session.profile?.complete),
  });

  const agents = useQuery({
    queryKey: ["agents", session.address],
    queryFn: () =>
      api<AgentView[]>("/agents", {
        headers: { authorization: `Bearer ${session.token}` },
      }),
    enabled: Boolean(session.token && session.profile?.complete),
  });

  const tasks = useQuery({
    queryKey: ["tasks", session.address],
    queryFn: () =>
      api<TaskView[]>("/tasks", {
        headers: { authorization: `Bearer ${session.token}` },
      }),
    enabled: Boolean(session.token && session.profile?.complete),
  });

  const integrations = useQuery({
    queryKey: ["integrations"],
    queryFn: () => api<IntegrationStatus>("/integrations/status"),
  });

  const runTask = useMutation({
    mutationFn: async () => {
      const agentEnsName = selectedAgent || agents.data?.[0]?.ensName;
      if (!agentEnsName) throw new Error("Select an agent first");
      const task = await api<TaskView>("/tasks", {
        method: "POST",
        headers: { authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ agentEnsName, prompt }),
      });
      setActiveTaskId(task.id);
      return api<RunResult>(`/tasks/${task.id}/run`, {
        method: "POST",
        headers: { authorization: `Bearer ${session.token}` },
        body: JSON.stringify({}),
      });
    },
    onSuccess: async (result) => {
      setLastResult(result);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["organization"] }),
        queryClient.invalidateQueries({
          queryKey: ["task-activity", result.task.id],
        }),
      ]);
    },
  });

  const taskActivity = useQuery({
    queryKey: ["task-activity", activeTaskId],
    queryFn: () =>
      api<TaskActivity[]>(`/tasks/${activeTaskId}/activity`, {
        headers: { authorization: `Bearer ${session.token}` },
      }),
    enabled: Boolean(activeTaskId),
    refetchInterval: runTask.isPending ? 750 : false,
  });

  const revokeAgent = useMutation({
    mutationFn: async (agent: AgentView) => {
      if (!session.token)
        throw new Error("Sign in with the organization admin wallet first");
      return api(`/agents/${encodeURIComponent(agent.ensName)}/revoke`, {
        method: "POST",
        headers: { authorization: `Bearer ${session.token}` },
      });
    },
    onSuccess: async () => {
      setRevokeTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agents"] }),
        queryClient.invalidateQueries({ queryKey: ["organization"] }),
      ]);
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setLastResult(null);
    setActiveTaskId(null);
    runTask.mutate();
  };

  const loadError = organization.error ?? agents.error ?? tasks.error;
  const metrics = organization.data?.metrics;

  if (organization.isPending || agents.isPending || tasks.isPending) {
    return <PageSkeleton cards={6} />;
  }

  return (
    <main className="dashboard-shell">
      <section className="dashboard-heading">
        <div>
          <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[#4efa94]">
            <span className="size-1.5 rounded-full bg-[#4efa94]" />
            Organization Workspace
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
            {organization.data?.name ?? "Acme"}
          </h1>
          <p className="mt-1 font-mono text-xs text-muted">
            {organization.data?.ensName ?? "ENS namespace pending configuration"}
          </p>
        </div>

        <div className="integration-pills">
          <IntegrationPill
            label="ENSv2"
            value={integrations.data?.ensv2.state}
          />
          <IntegrationPill
            label="Policy"
            value={integrations.data?.confidentialPolicy.state}
          />
          <IntegrationPill
            label="Capability"
            value={integrations.data?.capability.state}
          />
          <IntegrationPill
            label="Research"
            value={integrations.data?.research.state}
          />
        </div>
      </section>

      {loadError && (
        <div className="notice warning mb-6">
          API setup required: {loadError.message}
        </div>
      )}

      {/* Metrics Row */}
      <section className="metrics-grid" aria-label="Organization metrics">
        <Metric
          label="AI Workers"
          value={metrics?.agentCount ?? agents.data?.length ?? "—"}
        />
        <Metric label="Active Tasks" value={metrics?.activeTasks ?? "—"} />
        <Metric
          label="Authorized Actions"
          value={metrics?.authorizedActions ?? "—"}
        />
        <Metric
          label="Blocked Decisions"
          value={metrics?.blockedActions ?? "—"}
        />
      </section>

      {/* 2-Column Console Layout */}
      <div className="dashboard-grid">
        {/* Left: AI Workers */}
        <section className="panel agent-panel">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#4efa94]">
                Identity Layer
              </span>
              <h2 className="mt-1 text-xl font-semibold text-foreground">
                Registered AI Workers
              </h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 font-mono text-[10px] text-muted">
              {agents.data?.length ?? 0} active
            </span>
          </div>

          <div className="agent-list mt-5">
            {agents.isLoading && (
              <p className="font-mono text-xs text-muted">
                Resolving agents from ENS records…
              </p>
            )}
            {agents.data?.map((agent) => {
              const status = agent.ensVerified
                ? (agent.identity?.status ?? "unresolved")
                : "unverified";
              return (
                <article className="agent-card" key={agent.id}>
                  <div className="agent-title-row">
                    <div>
                      <h3>{agent.displayName}</h3>
                      <p>{agent.ensName}</p>
                    </div>
                    <span className={`status status-${status}`}>{status}</span>
                  </div>
                  <dl className="agent-facts">
                    <div>
                      <dt>Wallet</dt>
                      <dd>{shortAddress(agent.identity?.wallet)}</dd>
                    </div>
                    <div>
                      <dt>Role</dt>
                      <dd>{agent.identity?.role ?? "Not verified"}</dd>
                    </div>
                    <div>
                      <dt>Capability</dt>
                      <dd>
                        {agent.identity?.capabilities.join(", ") || "None"}
                      </dd>
                    </div>
                    <div>
                      <dt>Policy</dt>
                      <dd>
                        {agent.identity?.policyVersion ??
                          "Hidden / confidential"}
                      </dd>
                    </div>
                  </dl>
                  <div className="agent-actions">
                    <a
                      className="text-link"
                      href={`/app/agents/${encodeURIComponent(agent.ensName)}`}
                    >
                      Inspect Identity →
                    </a>
                    <button
                      className="danger-link"
                      disabled={status === "revoked"}
                      onClick={() => setRevokeTarget(agent)}
                    >
                      Revoke
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Right: Authorization Console */}
        <section className="panel action-panel">
          <div className="border-b border-white/5 pb-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#4efa94]">
              Decision Pipeline
            </span>
            <h2 className="mt-1 text-xl font-semibold text-foreground">
              Propose an Action
            </h2>
            <p className="mt-2 text-xs text-muted leading-relaxed">
              The agent planner proposes. ENS and confidential policy decide.
              Execution cannot bypass either checkpoint.
            </p>
          </div>

          <form onSubmit={submit} className="task-form">
            <label>
              Acting Agent
              <select
                value={selectedAgent}
                onChange={(event) => setSelectedAgent(event.target.value)}
              >
                <option value="">Select an agent</option>
                {agents.data?.map((agent) => (
                  <option value={agent.ensName} key={agent.id}>
                    {agent.displayName} ({agent.ensName})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Task Prompt / Proposed Intent
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={4}
                placeholder="Describe action (e.g. Buy 20 monitors for our new office)"
              />
            </label>

            <button
              className="brand-button w-full"
              disabled={runTask.isPending || !agents.data?.length}
            >
              <span>{runTask.isPending ? "Authorizing through LATCH…" : "Run through LATCH"}</span>
              <svg
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </button>
          </form>

          {(runTask.error || revokeAgent.error) && (
            <div className="notice error mt-4">
              {(runTask.error ?? revokeAgent.error)?.message}
            </div>
          )}

          {runTask.isPending && activeTaskId && (
            <LiveAuthorizationTimeline activities={taskActivity.data ?? []} />
          )}

          {lastResult && <AuthorizationResult result={lastResult} />}
        </section>
      </div>

      {/* Recent Activity Evidence */}
      <section className="panel activity-panel mt-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#4efa94]">
              Public Evidence
            </span>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              Recent Authorization Events
            </h2>
          </div>
          <span className="font-mono text-[10px] text-muted">Real-time</span>
        </div>

        <div className="activity-list">
          {organization.data?.recentActivity.length ? (
            organization.data.recentActivity.map((item) => (
              <div className="activity-row" key={item._id}>
                <span className={`activity-dot activity-${item.result}`} />
                <span className="text-foreground/90">{item.message}</span>
                <time>{new Date(item.createdAt).toLocaleTimeString()}</time>
              </div>
            ))
          ) : (
            <p className="font-mono text-xs text-muted py-4">
              No recorded activity yet. Run an action to generate cryptographic evidence.
            </p>
          )}
        </div>
      </section>

      {/* Revoke Modal Dialog */}
      {revokeTarget && (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={() => setRevokeTarget(null)}
        >
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="revoke-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-red-400">
              <span className="size-1.5 rounded-full bg-red-400" />
              Permanent Authority Revocation
            </span>
            <h2 id="revoke-title" className="mt-2 text-2xl font-bold text-foreground">
              Revoke {revokeTarget.displayName}?
            </h2>
            <p className="mt-3 text-xs text-muted leading-relaxed">
              Revocation writes <code className="text-red-400">latch.status=revoked</code> to ENS records
              and removes delegated capability permissions. Future actions stop immediately
              before reaching private policy.
            </p>
            {!session.connected && (
              <div className="notice warning mt-3">
                Connect the organization admin wallet to sign this transaction.
              </div>
            )}
            <div className="dialog-actions mt-6">
              <button
                className="brand-button-secondary text-xs"
                onClick={() => setRevokeTarget(null)}
              >
                Cancel
              </button>
              <button
                className="button-danger"
                disabled={!session.token || revokeAgent.isPending}
                onClick={() => revokeAgent.mutate(revokeTarget)}
              >
                {revokeAgent.isPending
                  ? "Signing on ENS…"
                  : "Revoke on ENSv2"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="metric">
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function IntegrationPill({ label, value }: { label: string; value?: string }) {
  const active = value === "connected" || value === "configured";
  return (
    <span
      className={`integration-pill ${active ? "integration-configured" : ""}`}
    >
      <i />
      {label}: {value ?? "checking"}
    </span>
  );
}

function AuthorizationResult({ result }: { result: RunResult }) {
  const ensAuthorized = Boolean(result.action?.ensAuthorized);
  const policyEvaluated = ensAuthorized;
  const policyAuthorized = Boolean(result.action?.policyAuthorized);
  const executionFailed =
    result.code === "CAPABILITY_UNAVAILABLE" ||
    result.code === "EXECUTION_FAILED";
  const isResearch = result.action?.actionType === "research.search";

  return (
    <div
      className={`result-card ${
        result.succeeded ? "result-success" : "result-blocked"
      }`}
    >
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#4efa94]">
          Authorization Decision
        </span>
        <span
          className={`font-mono text-[11px] font-semibold ${
            result.succeeded ? "text-[#4efa94]" : "text-red-400"
          }`}
        >
          {result.succeeded ? "SUCCESS" : "FAIL-CLOSED"}
        </span>
      </div>

      <h3 className="mt-3">
        {result.succeeded
          ? "Action authorized and released to execution"
          : executionFailed
            ? "Authorized action was not executed"
            : "Action blocked by security boundary"}
      </h3>

      <ol className="authorization-steps">
        <li className={ensAuthorized ? "passed" : "blocked"}>
          ENS Identity: {ensAuthorized ? "Verified onchain" : "Blocked / Revoked"}
        </li>
        <li
          className={
            !policyEvaluated
              ? "pending"
              : policyAuthorized
                ? "passed"
                : "blocked"
          }
        >
          Confidential Policy:{" "}
          {!policyEvaluated
            ? "Not reached"
            : policyAuthorized
              ? "Approved inside TEE"
              : "Denied by private rules"}
        </li>
        <li
          className={
            result.succeeded
              ? "passed"
              : executionFailed
                ? "blocked"
                : "pending"
          }
        >
          {isResearch ? "Tavily Research" : "Bazantic Execution"}:{" "}
          {result.succeeded
            ? "Action executed"
            : executionFailed
              ? "Failed safely"
              : "Not released"}
        </li>
      </ol>

      {result.action?.actionType === "procurement.purchase" && (
        <div className="mt-4 rounded-lg bg-white/[0.02] border border-white/5 p-3 font-mono text-xs text-muted">
          {result.action.quantity} × {result.action.item} · $
          {(result.action.amountCents / 100).toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}
        </div>
      )}

      {result.action?.actionType === "research.search" && (
        <div className="research-result-summary">
          <div>
            <span>Authorized query</span>
            <strong>{result.action.query}</strong>
          </div>
          {result.action.results?.map((item) => (
            <a href={item.url} target="_blank" rel="noreferrer" key={item.url}>
              <strong>{item.title}</strong>
              <small>{item.content}</small>
            </a>
          ))}
          {result.action.executionReference && (
            <code>Request: {result.action.executionReference}</code>
          )}
        </div>
      )}

      {result.code && (
        <div className="mt-2 font-mono text-[10px] text-muted/70">
          Reason code: <code>{result.code}</code>
        </div>
      )}
    </div>
  );
}

function LiveAuthorizationTimeline({
  activities,
}: {
  activities: TaskActivity[];
}) {
  const visible = activities.filter((activity) =>
    [
      "CAPABILITY_RESOLVED",
      "ENS_CHECKING",
      "ENS_AUTHORIZED",
      "POLICY_CHECKING",
      "POLICY_AUTHORIZED",
      "CAPABILITY_EXECUTION_STARTED",
      "ACTION_EXECUTED",
      "AUTHORIZATION_BLOCKED",
      "TASK_FAILED",
    ].includes(activity.type),
  );

  return (
    <div className="result-card live-result" aria-live="polite">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute h-full w-full animate-ping rounded-full bg-[#4efa94] opacity-75" />
          <span className="relative h-2 w-2 rounded-full bg-[#4efa94]" />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#4efa94]">
          Processing Pipeline
        </span>
      </div>
      <h3 className="mt-2">Evaluating cryptographic authorization…</h3>
      <ol className="live-steps">
        {visible.length ? (
          visible.map((activity) => (
            <li className={activity.result} key={activity._id}>
              <span>{activity.message}</span>
            </li>
          ))
        ) : (
          <li className="started">Planning the proposed action…</li>
        )}
      </ol>
    </div>
  );
}
