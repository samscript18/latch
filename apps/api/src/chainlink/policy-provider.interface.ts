import type {
  PolicyEvaluationInput,
  PolicyEvaluationResult,
} from "@latch/shared";

export const CONFIDENTIAL_POLICY_PROVIDER = Symbol(
  "CONFIDENTIAL_POLICY_PROVIDER",
);

export interface ConfidentialPolicyProvider {
  evaluate(input: PolicyEvaluationInput): Promise<PolicyEvaluationResult>;
}
