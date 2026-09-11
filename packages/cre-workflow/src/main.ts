import {
  decodeJson,
  handlerInTee,
  HTTPCapability,
  Runner,
  type HTTPPayload,
  type TeeRuntime,
} from "@chainlink/cre-sdk";
import { z } from "zod";

import {
  evaluatePrivatePolicy,
  PublicPolicyInputSchema,
  type PublicPolicyResult,
} from "./policy.js";

const WorkflowConfigSchema = z
  .object({
    policySecretId: z.string().trim().min(1),
    authorizedKey: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/)
      .optional(),
  })
  .strict();

type WorkflowConfig = z.infer<typeof WorkflowConfigSchema>;

function onHttpTrigger(
  runtime: TeeRuntime<WorkflowConfig>,
  payload: HTTPPayload,
): PublicPolicyResult {
  const input = PublicPolicyInputSchema.parse(decodeJson(payload.input));
  const privatePolicy = runtime
    .getSecret({ id: runtime.config.policySecretId })
    .result();

  // Do not log the request, secret, policy, vendor, amount, or detailed cause.
  return evaluatePrivatePolicy(input, privatePolicy.value);
}

function initWorkflow(config: WorkflowConfig) {
  const triggerConfig = config.authorizedKey
    ? {
        authorizedKeys: [
          {
            type: "KEY_TYPE_ECDSA_EVM" as const,
            publicKey: config.authorizedKey,
          },
        ],
      }
    : {};

  return [
    handlerInTee(
      new HTTPCapability().trigger(triggerConfig),
      onHttpTrigger,
      {},
    ),
  ];
}

export async function main(): Promise<void> {
  const runner = await Runner.newRunner<WorkflowConfig>({
    configSchema: WorkflowConfigSchema,
  });
  await runner.run(initWorkflow);
}
