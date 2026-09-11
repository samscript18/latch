import { z } from "zod";
import {
  AgentRoleSchema,
  AgentStatusSchema,
  CapabilitySchema,
  DenialCodeSchema,
} from "./domain.js";

export const EthereumAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address")
  .transform((address) => address.toLowerCase() as `0x${string}`);

export const EnsNameSchema = z.string().trim().min(3).toLowerCase();

export const EnsAgentIdentitySchema = z
  .object({
    name: EnsNameSchema,
    wallet: EthereumAddressSchema.nullable(),
    role: AgentRoleSchema.nullable(),
    status: AgentStatusSchema.nullable(),
    capabilities: z.array(CapabilitySchema),
    organization: EnsNameSchema.nullable(),
    policyVersion: z.string().trim().min(1).nullable(),
    resolver: EthereumAddressSchema.nullable(),
    checkedAtBlock: z.string().regex(/^\d+$/).optional(),
  })
  .strict();

export const PlannedActionSchema = z.object({
  capability: CapabilitySchema,
  productQuery: z.string().trim().min(1).max(200),
  quantity: z.number().int().positive().max(10_000),
});

export const PolicyEvaluationInputSchema = z.object({
  taskId: z.string().trim().min(1).max(128),
  agent: EnsNameSchema,
  capability: CapabilitySchema,
  vendor: z.string().trim().min(1).max(128),
  amountCents: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  policyVersion: z.string().trim().min(1).max(128),
});

export const PolicyEvaluationResultSchema = z
  .object({
    approved: z.boolean(),
    policyVersion: z.string().trim().min(1).max(128),
    reasonCode: z.enum(["POLICY_ALLOWED", "POLICY_DENIED"]),
  })
  .strict();

export const AuthorizationRequestSchema = z.object({
  taskId: z.string().trim().min(1).max(128),
  agentName: EnsNameSchema,
  agentWallet: EthereumAddressSchema,
  capability: CapabilitySchema,
  vendor: z.string().trim().min(1).max(128),
  amountCents: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
});

export const AuthorizationResponseSchema = z.object({
  authorized: z.boolean(),
  stage: z.enum(["ens", "policy", "capability"]),
  code: DenialCodeSchema.optional(),
  message: z.string().min(1),
});

export type PlannedAction = z.infer<typeof PlannedActionSchema>;
export type PolicyEvaluationInput = z.infer<typeof PolicyEvaluationInputSchema>;
export type PolicyEvaluationResult = z.infer<
  typeof PolicyEvaluationResultSchema
>;
export type AuthorizationResponse = z.infer<typeof AuthorizationResponseSchema>;
export type AuthorizationRequest = z.infer<typeof AuthorizationRequestSchema>;
