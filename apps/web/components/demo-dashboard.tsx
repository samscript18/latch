"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";
import { api, type AgentView } from "../lib/api";

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
}
interface RunResult {
  task: TaskView;
  action: null | {
    item: string;
    quantity: number;
    amountCents: number;
    ensAuthorized: boolean;
    policyAuthorized: boolean;
  };
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
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const [prompt, setPrompt] = useState("Buy 20 monitors for our new office");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<AgentView | null>(null);
  const [lastResult, setLastResult] = useState<RunResult | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const organization = useQuery({
    queryKey: ["organization"],
    queryFn: () => api<OrganizationView>("/organization"),
  });
  const agents = useQuery({
    queryKey: ["agents"],
    queryFn: () => api<AgentView[]>("/agents"),
  });
  const tasks = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api<TaskView[]>("/tasks"),
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
        body: JSON.stringify({ agentEnsName, prompt }),
      });
      setActiveTaskId(task.id);
      return api<RunResult>(`/tasks/${task.id}/run`, { method: "POST" });
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
    queryFn: () => api<TaskActivity[]>(`/tasks/${activeTaskId}/activity`),
    enabled: Boolean(activeTaskId),
    refetchInterval: runTask.isPending ? 750 : false,
  });

  const revokeAgent = useMutation({
    mutationFn: async (agent: AgentView) => {
      if (!address)
        throw new Error("Connect the organization admin wallet first");
      const challenge = await api<{ nonce: string; message: string }>(
        "/auth/nonce",
        {
          method: "POST",
          body: JSON.stringify({ address }),
        },
      );
      const signature = await signMessageAsync({ message: challenge.message });
      const session = await api<{ token: string }>("/auth/verify", {
        method: "POST",
        body: JSON.stringify({ address, nonce: challenge.nonce, signature }),
      });
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

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <Link className="wordmark" href="/">
          LATCH
        </Link>
        <nav className="demo-nav" aria-label="Demo navigation">
          <Link href="/demo">Workspace</Link>
          <Link href="/demo/activity">Activity</Link>
          <Link href="/demo/integrations">Integrations</Link>
        </nav>
        {isConnected ? (
          <button className="button button-quiet" onClick={() => disconnect()}>
            {shortAddress(address)}
          </button>
        ) : (
          <button
            className="button button-quiet"
            onClick={() =>
              connectors[0] && connect({ connector: connectors[0] })
            }
          >
            Connect admin wallet
          </button>
        )}
      </header>

      <section className="dashboard-heading">
        <div>
          <p className="eyebrow">Organization workspace</p>
          <h1>{organization.data?.name ?? "Acme"}</h1>
          <p className="muted">
            {organization.data?.ensName ??
              "ENS namespace pending configuration"}
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
        </div>
      </section>

      {loadError && (
        <div className="notice warning">
          API setup required: {loadError.message}
        </div>
      )}

      <section className="metrics-grid" aria-label="Organization metrics">
        <Metric
          label="Agents"
          value={metrics?.agentCount ?? agents.data?.length ?? "—"}
        />
        <Metric label="Active tasks" value={metrics?.activeTasks ?? "—"} />
        <Metric
          label="Authorized actions"
          value={metrics?.authorizedActions ?? "—"}
        />
        <Metric
          label="Blocked actions"
          value={metrics?.blockedActions ?? "—"}
        />
      </section>

      <div className="dashboard-grid">
        <section className="panel agent-panel">
          <p className="eyebrow">Identity</p>
          <h2>AI workers</h2>
          <div className="agent-list">
            {agents.isLoading && (
              <p className="muted">Resolving agents from ENS…</p>
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
                          "Hidden / unavailable"}
                      </dd>
                    </div>
                  </dl>
                  <div className="agent-actions">
                    <a
                      className="text-link"
                      href={`/demo/agents/${encodeURIComponent(agent.ensName)}`}
                    >
                      View agent
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

        <section className="panel action-panel">
          <p className="eyebrow">Authorization console</p>
          <h2>Propose an action</h2>
          <p className="muted panel-copy">
            The planner proposes. ENS and confidential policy decide. Execution
            cannot bypass either check.
          </p>
          <form onSubmit={submit} className="task-form">
            <label>
              Agent
              <select
                value={selectedAgent}
                onChange={(event) => setSelectedAgent(event.target.value)}
              >
                <option value="">Select an agent</option>
                {agents.data?.map((agent) => (
                  <option value={agent.ensName} key={agent.id}>
                    {agent.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Request
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={4}
              />
            </label>
            <button
              className="button button-primary"
              disabled={runTask.isPending || !agents.data?.length}
            >
              {runTask.isPending ? "Authorizing…" : "Run through LATCH"}
            </button>
          </form>
          {(runTask.error || revokeAgent.error) && (
            <div className="notice error">
              {(runTask.error ?? revokeAgent.error)?.message}
            </div>
          )}
          {runTask.isPending && activeTaskId && (
            <LiveAuthorizationTimeline activities={taskActivity.data ?? []} />
          )}
          {lastResult && <AuthorizationResult result={lastResult} />}
        </section>
      </div>

      <section className="panel activity-panel">
        <p className="eyebrow">Evidence</p>
        <h2>Recent activity</h2>
        <div className="activity-list">
          {organization.data?.recentActivity.length ? (
            organization.data.recentActivity.map((item) => (
              <div className="activity-row" key={item._id}>
                <span className={`activity-dot activity-${item.result}`} />
                <span>{item.message}</span>
                <time>{new Date(item.createdAt).toLocaleString()}</time>
              </div>
            ))
          ) : (
            <p className="muted">No recorded activity yet.</p>
          )}
        </div>
      </section>

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
            <p className="eyebrow">Permanent authority change</p>
            <h2 id="revoke-title">Revoke {revokeTarget.displayName}?</h2>
            <p>
              Revocation writes <code>latch.status=revoked</code> on ENS and
              removes delegated profile permission. Future LATCH execution stops
              before private policy evaluation.
            </p>
            {!isConnected && (
              <div className="notice warning">
                Connect the organization admin wallet to continue.
              </div>
            )}
            <div className="dialog-actions">
              <button
                className="button button-quiet"
                onClick={() => setRevokeTarget(null)}
              >
                Cancel
              </button>
              <button
                className="button button-danger"
                disabled={!isConnected || revokeAgent.isPending}
                onClick={() => revokeAgent.mutate(revokeTarget)}
              >
                {revokeAgent.isPending
                  ? "Waiting for signature…"
                  : "Revoke on ENS"}
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
  return (
    <div
      className={`result-card ${result.succeeded ? "result-success" : "result-blocked"}`}
    >
      <p className="eyebrow">Decision</p>
      <h3>
        {result.succeeded
          ? "Action authorized and executed"
          : executionFailed
            ? "Authorized action was not executed"
            : "Action blocked"}
      </h3>
      <ol className="authorization-steps">
        <li className={ensAuthorized ? "passed" : "blocked"}>
          ENS identity {ensAuthorized ? "verified" : "blocked"}
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
          Private policy{" "}
          {!policyEvaluated
            ? "— not evaluated"
            : policyAuthorized
              ? "approved"
              : "denied"}
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
          Capability execution{" "}
          {result.succeeded
            ? "completed"
            : executionFailed
              ? "failed safely"
              : "— not started"}
        </li>
      </ol>
      {result.action && (
        <p>
          {result.action.quantity} × {result.action.item} · $
          {(result.action.amountCents / 100).toLocaleString()}
        </p>
      )}
      {result.code && <code>{result.code}</code>}
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
      <p className="eyebrow">Live authorization</p>
      <h3>Processing through the LATCH pipeline</h3>
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
