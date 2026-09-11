import type { PublicPolicyInput, PublicPolicyResult } from "./policy.js";

/** Public boundary implemented by the confidential CRE handler. */
export interface ConfidentialWorkflowHandler {
  evaluate(input: PublicPolicyInput): Promise<PublicPolicyResult>;
}
