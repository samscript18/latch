import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  PolicyEvaluationInputSchema,
  PolicyEvaluationResultSchema,
  type PolicyEvaluationInput,
  type PolicyEvaluationResult,
} from "@latch/shared";
import type { Environment } from "../config/environment.js";
import { markIntegrationSuccess } from "../common/integration-telemetry.js";
import type { ConfidentialPolicyProvider } from "./policy-provider.interface.js";

@Injectable()
export class ChainlinkCrePolicyProvider implements ConfidentialPolicyProvider {
  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService<Environment, true>,
  ) {}

  async evaluate(
    unsafeInput: PolicyEvaluationInput,
  ): Promise<PolicyEvaluationResult> {
    const input = PolicyEvaluationInputSchema.parse(unsafeInput);
    const endpoint = this.config.get("CRE_WORKFLOW_URL", { infer: true });
    if (!endpoint) {
      throw new ServiceUnavailableException(
        "Chainlink confidential workflow is not configured",
      );
    }

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new ServiceUnavailableException(
        "Confidential policy verification is unavailable",
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(
        "Confidential policy verification is unavailable",
      );
    }

    const result = PolicyEvaluationResultSchema.safeParse(
      await response.json(),
    );
    if (!result.success || result.data.policyVersion !== input.policyVersion) {
      throw new ServiceUnavailableException(
        "Confidential policy returned an invalid verdict",
      );
    }
    markIntegrationSuccess("chainlink");
    return result.data;
  }
}
