type Check = { label: string; passed: boolean; detail?: string };
const apiUrl = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/$/, "");

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return (await response.json()) as Record<string, unknown>;
}

async function run(agentEnsName: string, prompt: string) {
  const task = await api("/tasks", {
    method: "POST",
    body: JSON.stringify({ agentEnsName, prompt }),
  });
  return api(`/tasks/${String(task.id)}/run`, { method: "POST" });
}

async function policyFixture(
  agent: string,
  taskId: string,
  amountCents: number,
) {
  const endpoint = process.env.CRE_WORKFLOW_URL;
  if (!endpoint) throw new Error("CRE_WORKFLOW_URL is missing");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      taskId,
      agent,
      capability: "procurement.purchase",
      vendor: "demo-vendor-a",
      amountCents,
      policyVersion: "procurement-v1",
    }),
  });
  if (!response.ok)
    throw new Error(`CRE workflow returned HTTP ${response.status}`);
  return (await response.json()) as { approved?: boolean; reasonCode?: string };
}

async function check(
  label: string,
  operation: () => Promise<boolean>,
): Promise<Check> {
  try {
    return { label, passed: await operation() };
  } catch (error) {
    return {
      label,
      passed: false,
      detail: error instanceof Error ? error.message : "unknown error",
    };
  }
}

function printSection(title: string, checks: Check[]): void {
  console.log(`\n[${title}]`);
  for (const item of checks) {
    console.log(
      `${item.label}: ${item.passed ? "PASS" : "FAIL"}${item.detail ? ` (${item.detail})` : ""}`,
    );
  }
}

async function main(): Promise<void> {
  const procurement = process.env.DEMO_PROCUREMENT_AGENT_ENS ?? "";
  const travel = process.env.DEMO_TRAVEL_AGENT_ENS ?? "";
  let agents: Array<Record<string, unknown>> = [];
  const agentEndpoint = await check("Agent endpoint", async () => {
    agents = (await api("/agents")) as unknown as Array<
      Record<string, unknown>
    >;
    return Array.isArray(agents);
  });
  const findAgent = (name: string) =>
    agents.find((agent) => agent.ensName === name);
  const identity = (name: string) =>
    findAgent(name)?.identity as Record<string, unknown> | null;
  const ensChecks: Check[] = [
    agentEndpoint,
    {
      label: "Procurement resolved",
      passed: Boolean(identity(procurement)?.wallet),
    },
    { label: "Travel resolved", passed: Boolean(identity(travel)?.wallet) },
    {
      label: "Procurement role",
      passed: identity(procurement)?.role === "procurement",
    },
    { label: "Travel role", passed: identity(travel)?.role === "travel" },
    {
      label: "Procurement active",
      passed: identity(procurement)?.status === "active",
    },
  ];
  const chainlinkChecks: Check[] = [
    {
      label: "Confidential workflow configured",
      passed: Boolean(process.env.CRE_WORKFLOW_URL),
    },
    await check("Allowed fixture", async () =>
      Boolean(
        (await policyFixture(procurement, "verify-allowed", 124_000)).approved,
      ),
    ),
    await check("Denied fixture", async () => {
      const result = await policyFixture(procurement, "verify-denied", 470_000);
      return result.approved === false && result.reasonCode === "POLICY_DENIED";
    }),
  ];
  const bazanticChecks: Check[] = [
    {
      label: "Gateway configured",
      passed: Boolean(process.env.BAZANTIC_GATEWAY_URL),
    },
    {
      label: "Recipe configured",
      passed: Boolean(process.env.BAZANTIC_RECIPE_ID),
    },
    await check("Capability invocation", async () =>
      Boolean(
        (await run(procurement, "Buy 20 standard office monitors")).succeeded,
      ),
    ),
  ];
  const authorizationChecks: Check[] = [
    await check("Wrong-role agent blocked by ENS", async () => {
      const result = await run(travel, "Buy 20 standard office monitors");
      if (result.succeeded !== false || result.code !== "ROLE_MISMATCH") {
        return false;
      }
      const task = result.task as Record<string, unknown> | undefined;
      if (!task?.id) return false;
      const activity = (await api(
        `/tasks/${String(task.id)}/activity`,
      )) as unknown as Array<Record<string, unknown>>;
      return !activity.some((item) => item.type === "POLICY_CHECKING");
    }),
  ];
  const databaseChecks = [
    await check(
      "MongoDB",
      async () => (await api("/health")).database === "connected",
    ),
  ];
  const appChecks = [
    await check(
      "API health",
      async () => (await api("/health")).status === "ok",
    ),
  ];
  printSection("ENS", ensChecks);
  printSection("CHAINLINK", chainlinkChecks);
  printSection("BAZANTIC", bazanticChecks);
  printSection("AUTHORIZATION", authorizationChecks);
  printSection("DATABASE", databaseChecks);
  printSection("APP", appChecks);
  const all = [
    ...ensChecks,
    ...chainlinkChecks,
    ...bazanticChecks,
    ...authorizationChecks,
    ...databaseChecks,
    ...appChecks,
  ];
  if (all.some((item) => !item.passed)) process.exitCode = 1;
}

void main();
