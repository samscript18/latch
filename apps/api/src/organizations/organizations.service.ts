import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { TaskStatus } from "@latch/shared";
import type { Model } from "mongoose";
import { getAddress, isAddress, type Address } from "viem";
import { normalize } from "viem/ens";
import { getAgentTypeDefinition } from "../agents/agent-type.registry.js";
import { Activity, type ActivityDocument } from "../database/schemas/activity.schema.js";
import { Agent, type AgentDocument } from "../database/schemas/agent.schema.js";
import { Organization, type OrganizationDocument } from "../database/schemas/organization.schema.js";
import { Task, type TaskDocument } from "../database/schemas/task.schema.js";

@Injectable()
export class OrganizationsService {
	constructor(
		@InjectModel(Organization.name)
		private readonly organizations: Model<OrganizationDocument>,
		@InjectModel(Agent.name) private readonly agents: Model<AgentDocument>,
		@InjectModel(Task.name) private readonly tasks: Model<TaskDocument>,
		@InjectModel(Activity.name)
		private readonly activities: Model<ActivityDocument>,
	) {}

	async getByOwner(ownerWallet: Address) {
		const organization = await this.organizations.findOne({ ownerWallet: ownerWallet.toLowerCase() }).exec();
		if (!organization) {
			return { exists: false, complete: false, organization: null };
		}
		const agents = await this.agents.find({ organizationId: organization._id }).sort({ displayName: 1 }).lean().exec();
		const activeStatuses: TaskStatus[] = ["created", "planning", "capability_resolved", "ens_checking", "ens_authorized", "policy_checking", "policy_authorized", "executing"];
		const [activeTasks, authorizedActions, blockedActions, recentActivity] = await Promise.all([
			this.tasks.countDocuments({
				organizationId: organization._id,
				status: { $in: activeStatuses },
			}),
			this.activities.countDocuments({
				organizationId: organization._id,
				result: "succeeded",
			}),
			this.activities.countDocuments({
				organizationId: organization._id,
				result: "blocked",
			}),
			this.activities.find({ organizationId: organization._id }).sort({ createdAt: -1 }).limit(10).lean().exec(),
		]);
		const hasCompleteAgents =
			agents.length > 0 &&
			agents.every((agent) => {
				const expectedCapability = agent.intendedRole === "procurement" ? "procurement.purchase" : agent.intendedRole === "research" ? "research.search" : null;
				return Boolean(agent.displayName && agent.ensName && agent.wallet && expectedCapability && agent.intendedCapabilities?.includes(expectedCapability) && agent.intendedPolicyVersion);
			});
		const complete = organization.onboardingStatus === "complete" && Boolean(organization.name && organization.ensName && organization.ownerWallet) && hasCompleteAgents;
		return {
			exists: true,
			complete,
			organization: {
				id: organization._id.toString(),
				name: organization.name,
				ensName: organization.ensName,
				ownerWallet: organization.ownerWallet,
				website: organization.website ?? "",
				industry: organization.industry ?? "",
				onboardingStatus: organization.onboardingStatus,
				policy: {
					provider: organization.policyProvider ?? "manual",
					procurement:
						organization.policyProvider === "chainlink"
							? { status: "configured_externally" }
							: {
									status: organization.manualProcurementPolicy ? "configured" : "not_configured",
									policyVersion: organization.manualProcurementPolicy?.policyVersion ?? "procurement-v1",
									maxAutonomousSpendCents: organization.manualProcurementPolicy?.maxAutonomousSpendCents ?? 200_000,
									allowedVendors: organization.manualProcurementPolicy?.allowedVendors ?? ["demo-vendor-a", "demo-vendor-b"],
								},
					research:
						organization.policyProvider === "chainlink"
							? { status: "configured_externally" }
							: {
									status: organization.manualResearchPolicy ? "configured" : "not_configured",
									policyVersion: organization.manualResearchPolicy?.policyVersion ?? "research-v1",
									allowedDomains: organization.manualResearchPolicy?.allowedDomains ?? [],
									blockedDomains: organization.manualResearchPolicy?.blockedDomains ?? [],
									maxResults: organization.manualResearchPolicy?.maxResults ?? 10,
								},
				},
				metrics: {
					agentCount: agents.length,
					activeTasks,
					authorizedActions,
					blockedActions,
				},
				recentActivity,
				agents: agents.map((agent) => ({
					id: agent._id.toString(),
					displayName: agent.displayName,
					ensName: agent.ensName,
					wallet: agent.wallet,
					type: agent.intendedRole === "procurement" || agent.intendedRole === "research" ? agent.intendedRole : undefined,
					role: agent.intendedRole,
					capability: agent.intendedCapabilities?.[0],
					policyVersion: agent.intendedPolicyVersion,
					provisioningStatus: agent.provisioningStatus,
				})),
			},
		};
	}

	async createForOwner(ownerWallet: Address, input: OrganizationInput) {
		const normalizedOwner = ownerWallet.toLowerCase();
		const existing = await this.organizations.exists({
			ownerWallet: normalizedOwner,
		});
		if (existing) {
			throw new ConflictException("This admin wallet already has a LATCH workspace");
		}
		return this.saveForOwner(ownerWallet, input, true);
	}

	async updateForOwner(ownerWallet: Address, input: OrganizationInput) {
		const normalizedOwner = ownerWallet.toLowerCase();
		const existing = await this.organizations.exists({
			ownerWallet: normalizedOwner,
		});
		if (!existing) {
			throw new NotFoundException("No LATCH workspace exists for this admin wallet");
		}
		return this.saveForOwner(ownerWallet, input, false);
	}

	async updatePolicy(ownerWallet: Address, input: OrganizationPolicyInput) {
		const normalizedOwner = ownerWallet.toLowerCase();
		const update =
			input.provider === "chainlink"
				? {
						$set: { policyProvider: "chainlink" },
						$unset: { manualProcurementPolicy: 1, manualResearchPolicy: 1 },
					}
				: {
						$set: {
							policyProvider: "manual",
							manualProcurementPolicy: {
								...input.procurement,
								allowedVendors: normalizeList(input.procurement.allowedVendors),
							},
							manualResearchPolicy: {
								...input.research,
								allowedDomains: normalizeList(input.research.allowedDomains),
								blockedDomains: normalizeList(input.research.blockedDomains),
							},
						},
					};
		const organization = await this.organizations.findOneAndUpdate({ ownerWallet: normalizedOwner }, update, { new: true });
		if (!organization) throw new NotFoundException("Organization not found");
		return this.getByOwner(ownerWallet);
	}

	private async saveForOwner(ownerWallet: Address, input: OrganizationInput, create: boolean) {
		const normalizedOwner = ownerWallet.toLowerCase();
		const ensName = this.normalizeEns(input.ensName);
		const agents = input.agents.map((agent) => {
			const template = getAgentTypeDefinition(agent.type);
			return {
				displayName: template.displayName,
				ensName: this.normalizeEns(agent.ensName),
				wallet: this.normalizeWallet(agent.wallet),
				intendedRole: template.role,
				intendedCapabilities: [...template.capabilities],
				intendedPolicyVersion: template.policyVersion,
				provisioningStatus: "pending_ens" as const,
			};
		});
		if (new Set(agents.map((agent) => agent.ensName)).size !== agents.length) {
			throw new ConflictException("Agent ENS names must be unique");
		}
		for (const agent of agents) {
			if (!agent.ensName.endsWith(`.${ensName}`)) {
				throw new ConflictException(`${agent.ensName} must be a subname of ${ensName}`);
			}
		}
		const ensOwner = await this.organizations
			.findOne({ ensName, ownerWallet: { $ne: normalizedOwner } })
			.lean()
			.exec();
		if (ensOwner) {
			throw new ConflictException("That ENS namespace belongs to another LATCH organization");
		}
		const conflictingAgent = await this.agents.findOne({
			ensName: { $in: agents.map((agent) => agent.ensName) },
			organizationId: {
				$nin: await this.organizations.find({ ownerWallet: ownerWallet.toLowerCase() }).distinct("_id"),
			},
		});
		if (conflictingAgent) {
			throw new ConflictException(`${conflictingAgent.ensName} is already registered to another organization`);
		}

		const organization = await this.organizations.findOneAndUpdate(
			{ ownerWallet: normalizedOwner },
			{
				$set: {
					name: input.name.trim(),
					ensName,
					ownerWallet: normalizedOwner,
					website: input.website?.trim() || undefined,
					industry: input.industry?.trim() || undefined,
					onboardingStatus: "complete",
				},
			},
			{ new: true, upsert: create, setDefaultsOnInsert: create },
		);
		if (!organization) throw new ConflictException("Onboarding could not be saved");

		await Promise.all(agents.map((agent) => this.agents.findOneAndUpdate({ ensName: agent.ensName }, { $set: { ...agent, organizationId: organization._id } }, { upsert: true, new: true, setDefaultsOnInsert: true })));
		await this.agents.deleteMany({
			organizationId: organization._id,
			ensName: { $nin: agents.map((agent) => agent.ensName) },
		});
		return this.getByOwner(ownerWallet);
	}

	private normalizeEns(value: string): string {
		try {
			return normalize(value.trim());
		} catch {
			throw new ConflictException(`Invalid ENS name: ${value}`);
		}
	}

	private normalizeWallet(value: string): string {
		if (!isAddress(value, { strict: false })) {
			throw new ConflictException(`Invalid agent wallet: ${value}`);
		}
		return getAddress(value).toLowerCase();
	}
}

interface OrganizationInput {
	name: string;
	ensName: string;
	website?: string;
	industry?: string;
	agents: Array<{
		ensName: string;
		wallet: string;
		type: "procurement" | "research";
	}>;
}

type OrganizationPolicyInput =
	| { provider: "chainlink" }
	| {
			provider: "manual";
			procurement: {
				policyVersion: string;
				maxAutonomousSpendCents: number;
				allowedVendors: string[];
			};
			research: {
				policyVersion: string;
				allowedDomains: string[];
				blockedDomains: string[];
				maxResults: number;
			};
	  };

function normalizeList(values: string[]): string[] {
	return [...new Set(values.map((value) => value.trim().toLowerCase()))].filter(Boolean);
}
