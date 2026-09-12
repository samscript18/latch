"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { api, type AgentView } from "../lib/api";
import { PageSkeleton } from "./loading-state";
import { useWalletSession } from "./wallet-session";

interface TaskView { id: string; prompt: string; status: string; requestedCapability?: string }
interface TaskActivity { _id: string; type: string; result: "started" | "authorized" | "blocked" | "failed" | "succeeded"; message: string }
interface ProcurementAction { actionType: "procurement.purchase"; item: string; quantity: number; amountCents: number; ensAuthorized: boolean; policyAuthorized: boolean; source?: string; executionReference?: string }
interface ResearchAction { actionType: "research.search"; query: string; domains: string[]; maxResults: number; ensAuthorized: boolean; policyAuthorized: boolean; executionReference?: string; results: Array<{ title: string; url: string; content: string }> }
interface RunResult { task: TaskView; action: ProcurementAction | ResearchAction | null; succeeded: boolean; code?: string }

const exampleByRole = {
  procurement: "Buy 2 standard office monitors for our new office",
  research: "Research current AI security standards and find reliable sources",
} as const;

export function TryNowConsole() {
  const session = useWalletSession();
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState("");
  const [prompt, setPrompt] = useState("");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const agents = useQuery({ queryKey: ["agents", session.address], queryFn: () => api<AgentView[]>("/agents", { headers: { authorization: `Bearer ${session.token}` } }), enabled: Boolean(session.token && session.profile?.complete) });
  const activity = useQuery({ queryKey: ["task-activity", activeTaskId], queryFn: () => api<TaskActivity[]>(`/tasks/${activeTaskId}/activity`, { headers: { authorization: `Bearer ${session.token}` } }), enabled: Boolean(activeTaskId), refetchInterval: activeTaskId && !result ? 750 : false });

  useEffect(() => {
    const first = agents.data?.[0];
    if (!first || selectedAgent) return;
    setSelectedAgent(first.ensName);
    setPrompt(exampleByRole[first.intendedRole === "research" ? "research" : "procurement"]);
  }, [agents.data, selectedAgent]);

  const run = useMutation({
    mutationFn: async () => {
      const agent = agents.data?.find((item) => item.ensName === selectedAgent);
      if (!agent) throw new Error("Select an AI worker first");
      if (!agent.ensVerified || agent.identity?.status !== "active") throw new Error("This worker needs an active, verified ENS identity before it can execute tasks");
      const task = await api<TaskView>("/tasks", { method: "POST", headers: { authorization: `Bearer ${session.token}` }, body: JSON.stringify({ agentEnsName: agent.ensName, prompt }) });
      setActiveTaskId(task.id);
      return api<RunResult>(`/tasks/${task.id}/run`, { method: "POST", headers: { authorization: `Bearer ${session.token}` }, body: JSON.stringify({}) });
    },
    onSuccess: async (value) => { setResult(value); await Promise.all([queryClient.invalidateQueries({ queryKey: ["tasks"] }), queryClient.invalidateQueries({ queryKey: ["organization"] }), queryClient.invalidateQueries({ queryKey: ["task-activity", value.task.id] })]); },
  });

  if (agents.isPending) return <PageSkeleton cards={3} />;
  const selected = agents.data?.find((agent) => agent.ensName === selectedAgent);
  const submit = (event: FormEvent) => { event.preventDefault(); setResult(null); setActiveTaskId(null); run.mutate(); };

  return <main className="detail-shell app-page try-now-page">
    <header className="detail-header"><div><p className="eyebrow">Live authorization console</p><h1>Try LATCH</h1><p className="muted">Send a real proposal through identity, policy, and capability execution.</p></div><Link className="text-link" href="/app/tasks">View all tasks →</Link></header>
    <div className="try-now-layout">
      <section className="panel try-now-form-card">
        <div className="section-heading"><div><p className="eyebrow">Proposed intent</p><h2>What should your worker do?</h2></div><span className="status status-checking">Sepolia</span></div>
        <form className="task-form" onSubmit={submit}>
          <label>Acting AI worker<select value={selectedAgent} onChange={(event) => { const ensName = event.target.value; setSelectedAgent(ensName); const agent = agents.data?.find((item) => item.ensName === ensName); if (agent) setPrompt(exampleByRole[agent.intendedRole === "research" ? "research" : "procurement"]); }}><option value="">Select a worker</option>{agents.data?.map((agent) => <option value={agent.ensName} key={agent.id}>{agent.displayName} ({agent.ensName})</option>)}</select></label>
          {selected && <div className={`worker-readiness ${selected.ensVerified && selected.identity?.status === "active" ? "ready" : "not-ready"}`}><span>{selected.ensVerified && selected.identity?.status === "active" ? "✓" : "!"}</span><div><strong>{selected.ensVerified ? "ENS identity verified" : "ENS setup required"}</strong><small>{selected.identity?.role ?? selected.intendedRole} · {selected.identity?.capabilities.join(", ") || selected.intendedCapabilities.join(", ")}</small></div></div>}
          <label>Task prompt / proposed intent<textarea required value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={6} /></label>
          <button className="brand-button try-now-submit" disabled={run.isPending || !selectedAgent || !prompt.trim()}>{run.isPending ? "Authorizing through LATCH…" : "Run complete pipeline"}<span aria-hidden="true">↯</span></button>
        </form>
        {run.error && <div className="notice error">{run.error.message}</div>}
      </section>
      <section className="panel pipeline-card">
        <div><p className="eyebrow">Decision pipeline</p><h2>Authorization progress</h2><p className="muted">Each stage must pass before the next begins.</p></div>
        <Pipeline activities={activity.data ?? []} pending={run.isPending} result={result} />
      </section>
    </div>
    {result && <ResultCard result={result} />}
  </main>;
}

function Pipeline({ activities, pending, result }: { activities: TaskActivity[]; pending: boolean; result: RunResult | null }) {
  const types = new Set(activities.map((item) => item.type));
  const blocked = activities.find((item) => item.result === "blocked" || item.result === "failed");
  const steps = [
    ["Plan & capability", types.has("CAPABILITY_RESOLVED")],
    ["ENS identity", types.has("ENS_AUTHORIZED")],
    ["Organizational policy", types.has("POLICY_AUTHORIZED")],
    ["Capability execution", types.has("ACTION_EXECUTED")],
  ] as const;
  return <ol className="try-pipeline-steps">{steps.map(([label, passed], index) => { const failed = Boolean(blocked) && !passed && steps.slice(0, index).every(([, done]) => done); return <li className={passed ? "passed" : failed ? "blocked" : pending ? "pending" : "idle"} key={label}><span>{passed ? "✓" : failed ? "×" : index + 1}</span><div><strong>{label}</strong><small>{passed ? "Passed" : failed ? blocked?.message : pending ? "Waiting…" : "Not started"}</small></div></li>; })}{result?.succeeded && <li className="passed"><span>✓</span><div><strong>Completed</strong><small>Authorized action executed</small></div></li>}</ol>;
}

function ResultCard({ result }: { result: RunResult }) {
  const action = result.action;
  const identityReached = Boolean(action);
  const ensPassed = Boolean(action?.ensAuthorized);
  const policyPassed = Boolean(action?.policyAuthorized);
  const provider = action?.actionType === "research.search" ? "Tavily" : action?.source === "local-fixture" ? "Local development provider" : "Bazantic";
  return <section className={`result-card try-result ${result.succeeded ? "result-success" : "result-blocked"}`}><div className="section-heading"><div><p className="eyebrow">Authorization decision</p><h2>{result.succeeded ? "Action authorized and executed" : "Action stopped safely"}</h2></div><span className={`status ${result.succeeded ? "status-authorized" : "status-blocked"}`}>{result.succeeded ? "Success" : "Fail-closed"}</span></div><ol className="authorization-steps"><li className={ensPassed ? "passed" : identityReached ? "blocked" : "pending"}>ENS Identity: {ensPassed ? "Verified onchain" : identityReached ? "Blocked" : "Not reached"}</li><li className={policyPassed ? "passed" : ensPassed ? "blocked" : "pending"}>Organizational Policy: {policyPassed ? "Approved" : ensPassed ? "Denied or unavailable" : "Not reached"}</li><li className={result.succeeded ? "passed" : policyPassed ? "blocked" : "pending"}>{provider}: {result.succeeded ? "Executed" : policyPassed ? "Execution unavailable" : "Not reached"}</li></ol>{action?.actionType === "procurement.purchase" && <div className="execution-summary"><strong>{action.quantity} × {action.item}</strong><span>${(action.amountCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span><code>{action.executionReference}</code></div>}{action?.actionType === "research.search" && <div className="research-result-summary">{action.results.map((item) => <a href={item.url} key={item.url} rel="noreferrer" target="_blank"><strong>{item.title}</strong><small>{item.content}</small></a>)}{action.executionReference && <code>Request: {action.executionReference}</code>}</div>}{result.code && <p className="result-code">Reason code: {result.code}</p>}<Link className="text-link" href={`/app/tasks/${result.task.id}`}>Open task details →</Link></section>;
}
