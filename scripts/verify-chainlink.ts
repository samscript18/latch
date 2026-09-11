import {
  PolicyEvaluationInputSchema,
  PolicyEvaluationResultSchema,
  type PolicyEvaluationInput,
} from "@latch/shared";

async function evaluate(input: PolicyEvaluationInput) {
  const endpoint = process.env.CRE_WORKFLOW_URL;
  if (!endpoint) throw new Error("CRE_WORKFLOW_URL is required");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(PolicyEvaluationInputSchema.parse(input)),
  });
  if (!response.ok)
    throw new Error(`CRE workflow returned HTTP ${response.status}`);
  return PolicyEvaluationResultSchema.parse(await response.json());
}

async function main(): Promise<void> {
  const agent = process.env.DEMO_PROCUREMENT_AGENT_ENS;
  if (!agent) throw new Error("DEMO_PROCUREMENT_AGENT_ENS is required");
  const common = {
    agent,
    capability: "procurement.purchase" as const,
    vendor: "demo-vendor-a",
    policyVersion: "procurement-v1",
  };
  const approved = await evaluate({
    ...common,
    taskId: "verify-approved",
    amountCents: 124_000,
  });
  const denied = await evaluate({
    ...common,
    taskId: "verify-denied",
    amountCents: 470_000,
  });
  if (!approved.approved || denied.approved)
    throw new Error("CRE verdicts did not match fixtures");
  console.log("$1,240 scenario -> APPROVED");
  console.log("$4,700 scenario -> DENIED");
}

void main();
