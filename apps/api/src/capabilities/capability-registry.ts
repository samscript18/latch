import { requiredRoleByCapability, type Capability } from "@latch/shared";

export const capabilityRegistry = {
  "procurement.purchase": {
    requiredRole: requiredRoleByCapability["procurement.purchase"],
    provider: "bazantic",
    executable: true,
  },
  "travel.booking": {
    requiredRole: requiredRoleByCapability["travel.booking"],
    provider: "bazantic",
    executable: false,
  },
} as const satisfies Record<
  Capability,
  { requiredRole: string; provider: "bazantic"; executable: boolean }
>;
