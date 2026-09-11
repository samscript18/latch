import { Injectable } from "@nestjs/common";
import {
  PolicyEvaluationInputSchema,
  PolicyEvaluationResultSchema,
  type PolicyEvaluationInput,
  type PolicyEvaluationResult,
} from "@latch/shared";
import type { ConfidentialPolicyProvider } from "./policy-provider.interface.js";

// Development-only fixture. It is never selected in HACKATHON_MODE.
const localDevelopmentPolicy = Object.freeze({
  policyVersion: "procurement-v1",
  maxAutonomousSpendCents: 200_000,
  allowedVendors: new Set(["demo-vendor-a", "demo-vendor-b"]),
});

@Injectable()
export class LocalPolicyProvider implements ConfidentialPolicyProvider {
  async evaluate(
    unsafeInput: PolicyEvaluationInput,
  ): Promise<PolicyEvaluationResult> {
    const input = PolicyEvaluationInputSchema.parse(unsafeInput);
    const approved =
      input.policyVersion === localDevelopmentPolicy.policyVersion &&
      localDevelopmentPolicy.allowedVendors.has(input.vendor) &&
      input.amountCents <= localDevelopmentPolicy.maxAutonomousSpendCents;

    return PolicyEvaluationResultSchema.parse({
      approved,
      policyVersion: input.policyVersion,
      reasonCode: approved ? "POLICY_ALLOWED" : "POLICY_DENIED",
    });
  }
}
