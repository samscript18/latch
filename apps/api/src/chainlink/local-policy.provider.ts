import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import {
  PolicyEvaluationInputSchema,
  PolicyEvaluationResultSchema,
  type PolicyEvaluationInput,
  type PolicyEvaluationResult,
} from "@latch/shared";
import type { ConfidentialPolicyProvider } from "./policy-provider.interface.js";
import { Agent, type AgentDocument } from "../database/schemas/agent.schema.js";
import {
  Organization,
  type OrganizationDocument,
} from "../database/schemas/organization.schema.js";

// Development-only fixture. It is never selected in HACKATHON_MODE.
const localDevelopmentPolicy = Object.freeze({
  policyVersion: "procurement-v1",
  maxAutonomousSpendCents: 200_000,
  allowedVendors: new Set(["demo-vendor-a", "demo-vendor-b"]),
});

const localResearchPolicy = Object.freeze({
  policyVersion: "research-v1",
  allowedDomains: Object.freeze(["*.edu", "who.int", "nih.gov"]),
  blockedDomains: Object.freeze([] as string[]),
  maxResults: 10,
});

@Injectable()
export class LocalPolicyProvider implements ConfidentialPolicyProvider {
  constructor(
    @Optional()
    @InjectModel(Agent.name)
    private readonly agents?: Model<AgentDocument>,
    @Optional()
    @InjectModel(Organization.name)
    private readonly organizations?: Model<OrganizationDocument>,
  ) {}

  async evaluate(
    unsafeInput: PolicyEvaluationInput,
  ): Promise<PolicyEvaluationResult> {
    const input = PolicyEvaluationInputSchema.parse(unsafeInput);
    const storedPolicy = await this.policyFor(input.agent);
    const approved =
      input.capability === "procurement.purchase"
        ? input.policyVersion === storedPolicy.procurement.policyVersion &&
          storedPolicy.procurement.allowedVendors.has(input.vendor) &&
          input.amountCents <= storedPolicy.procurement.maxAutonomousSpendCents
        : input.policyVersion === storedPolicy.research.policyVersion &&
          input.maxResults <= storedPolicy.research.maxResults &&
          input.domains.every(
            (domain) =>
              !storedPolicy.research.blockedDomains.some((blocked) =>
                domainMatches(domain, blocked),
              ) &&
              (storedPolicy.research.allowedDomains.length === 0 ||
                storedPolicy.research.allowedDomains.some((allowed) =>
                  domainMatches(domain, allowed),
                )),
          );

    return PolicyEvaluationResultSchema.parse({
      approved,
      policyVersion: input.policyVersion,
      reasonCode: approved ? "POLICY_ALLOWED" : "POLICY_DENIED",
    });
  }

  private async policyFor(agentEnsName: string) {
    if (this.agents && this.organizations) {
      const agent = await this.agents
        .findOne({ ensName: agentEnsName })
        .lean()
        .exec();
      const organization = agent
        ? await this.organizations.findById(agent.organizationId).lean().exec()
        : null;
      if (organization?.policyProvider === "manual") {
        return {
          procurement: organization.manualProcurementPolicy
            ? {
                ...organization.manualProcurementPolicy,
                allowedVendors: new Set(
                  organization.manualProcurementPolicy.allowedVendors,
                ),
              }
            : localDevelopmentPolicy,
          research: organization.manualResearchPolicy ?? localResearchPolicy,
        };
      }
    }
    return {
      procurement: localDevelopmentPolicy,
      research: localResearchPolicy,
    };
  }
}

function domainMatches(domain: string, rule: string): boolean {
  const normalizedDomain = domain.toLowerCase().replace(/^www\./, "");
  const normalizedRule = rule.toLowerCase();
  if (normalizedRule.startsWith("*.")) {
    const suffix = normalizedRule.slice(1);
    return normalizedDomain.endsWith(suffix);
  }
  return normalizedDomain === normalizedRule;
}
