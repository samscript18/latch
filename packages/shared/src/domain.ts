import { z } from "zod";

export const agentRoles = ["procurement", "travel"] as const;
export const agentStatuses = ["active", "revoked"] as const;
export const capabilities = ["procurement.purchase", "travel.booking"] as const;
export const taskStatuses = [
  "created",
  "planning",
  "capability_resolved",
  "ens_checking",
  "ens_authorized",
  "policy_checking",
  "policy_authorized",
  "executing",
  "succeeded",
  "blocked",
  "failed",
] as const;
export const denialCodes = [
  "ENS_NAME_UNRESOLVED",
  "ENS_WALLET_MISMATCH",
  "AGENT_REVOKED",
  "ROLE_MISMATCH",
  "CAPABILITY_MISSING",
  "POLICY_DENIED",
  "CAPABILITY_UNAVAILABLE",
  "EXECUTION_FAILED",
] as const;

export const AgentRoleSchema = z.enum(agentRoles);
export const AgentStatusSchema = z.enum(agentStatuses);
export const CapabilitySchema = z.enum(capabilities);
export const TaskStatusSchema = z.enum(taskStatuses);
export const DenialCodeSchema = z.enum(denialCodes);

export type AgentRole = z.infer<typeof AgentRoleSchema>;
export type AgentStatus = z.infer<typeof AgentStatusSchema>;
export type Capability = z.infer<typeof CapabilitySchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type DenialCode = z.infer<typeof DenialCodeSchema>;

export interface EnsAgentIdentity {
  name: string;
  wallet: `0x${string}` | null;
  role: AgentRole | null;
  status: AgentStatus | null;
  capabilities: Capability[];
  organization: string | null;
  policyVersion: string | null;
  resolver: `0x${string}` | null;
  checkedAtBlock?: bigint;
}

export interface EnsAuthorizationResult {
  authorized: boolean;
  agentName: string;
  agentWallet: `0x${string}` | null;
  role: AgentRole | null;
  status: AgentStatus | null;
  capability: Capability;
  policyVersion: string | null;
  denialCode?: DenialCode;
  checkedAtBlock?: bigint;
}

export const requiredRoleByCapability = {
  "procurement.purchase": "procurement",
  "travel.booking": "travel",
} as const satisfies Record<Capability, AgentRole>;

export const publicDenialMessages = {
  ENS_NAME_UNRESOLVED: "The agent identity could not be resolved.",
  ENS_WALLET_MISMATCH: "The agent wallet does not match its verified identity.",
  AGENT_REVOKED: "This agent's authority has been revoked.",
  ROLE_MISMATCH: "This agent does not have the required organizational role.",
  CAPABILITY_MISSING: "This capability is not assigned to the agent.",
  POLICY_DENIED: "This action violates organizational policy.",
  CAPABILITY_UNAVAILABLE: "The approved capability is currently unavailable.",
  EXECUTION_FAILED: "The action could not be executed.",
} as const satisfies Record<DenialCode, string>;
