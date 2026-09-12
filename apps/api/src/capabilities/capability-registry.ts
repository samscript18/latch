import { requiredRoleByCapability, type Capability } from "@latch/shared";

export const capabilityRegistry = {
  "procurement.purchase": {
    requiredRole: requiredRoleByCapability["procurement.purchase"],
    provider: "bazantic",
    executable: true,
  },
  "research.search": {
    requiredRole: requiredRoleByCapability["research.search"],
    provider: "tavily",
    executable: true,
  },
} as const satisfies Record<
  Capability,
  { requiredRole: string; provider: "bazantic" | "tavily"; executable: boolean }
>;
