import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import type { PolicyEvaluationInput, PolicyEvaluationResult } from "@latch/shared";
import type { Model } from "mongoose";
import type { Environment } from "../config/environment.js";
import { Agent, type AgentDocument } from "../database/schemas/agent.schema.js";
import { Organization, type OrganizationDocument } from "../database/schemas/organization.schema.js";
import { ChainlinkCrePolicyProvider } from "./chainlink-cre-policy.provider.js";
import { LocalPolicyProvider } from "./local-policy.provider.js";
import type { ConfidentialPolicyProvider } from "./policy-provider.interface.js";

@Injectable()
export class OrganizationPolicyProvider implements ConfidentialPolicyProvider {
	constructor(
		@InjectModel(Agent.name) private readonly agents: Model<AgentDocument>,
		@InjectModel(Organization.name)
		private readonly organizations: Model<OrganizationDocument>,
		@Inject(ConfigService)
		private readonly config: ConfigService<Environment, true>,
		@Inject(LocalPolicyProvider) private readonly manual: LocalPolicyProvider,
		@Inject(ChainlinkCrePolicyProvider)
		private readonly chainlink: ChainlinkCrePolicyProvider,
	) {}

	async evaluate(input: PolicyEvaluationInput): Promise<PolicyEvaluationResult> {
		const agent = await this.agents.findOne({ ensName: input.agent }).lean().exec();
		const organization = agent ? await this.organizations.findById(agent.organizationId).lean().exec() : null;
		const provider = organization?.policyProvider ?? (this.config.get("POLICY_PROVIDER", { infer: true }) === "chainlink" ? "chainlink" : "manual");
		if (this.config.get("HACKATHON_MODE", { infer: true }) && provider !== "chainlink") {
			throw new ServiceUnavailableException("Hackathon mode requires Chainlink confidential policy");
		}
		return provider === "chainlink" ? this.chainlink.evaluate(input) : this.manual.evaluate(input);
	}
}
