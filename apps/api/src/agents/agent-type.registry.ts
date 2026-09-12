import type { AgentRole, AgentType, Capability } from "@latch/shared";

export interface AgentTypeDefinition {
  type: AgentType;
  displayName: string;
  description: string;
  role: AgentRole;
  capabilities: readonly Capability[];
  policyVersion: string;
}

export const agentTypeRegistry = Object.freeze({
  procurement: Object.freeze({
    type: "procurement",
    displayName: "Procurement Agent",
    description: "Source products and request authorized purchases.",
    role: "procurement",
    capabilities: ["procurement.purchase"] as const,
    policyVersion: "procurement-v1",
  }),
  research: Object.freeze({
    type: "research",
    displayName: "Research Agent",
    description: "Perform authorized web research using approved research tools.",
    role: "research",
    capabilities: ["research.search"] as const,
    policyVersion: "research-v1",
  }),
} as const satisfies Record<AgentType, AgentTypeDefinition>);

export function getAgentTypeDefinition(type: AgentType): AgentTypeDefinition {
  return agentTypeRegistry[type];
}
