import { ConflictException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { TaskStatus } from "@latch/shared";
import type { Model } from "mongoose";
import { getAddress, isAddress, type Address } from "viem";
import { normalize } from "viem/ens";
import {
  Activity,
  type ActivityDocument,
} from "../database/schemas/activity.schema.js";
import { Agent, type AgentDocument } from "../database/schemas/agent.schema.js";
import {
  Organization,
  type OrganizationDocument,
} from "../database/schemas/organization.schema.js";
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
    const organization = await this.organizations
      .findOne({ ownerWallet: ownerWallet.toLowerCase() })
      .exec();
    if (!organization) {
      return { exists: false, complete: false, organization: null };
    }
    const agents = await this.agents
      .find({ organizationId: organization._id })
      .sort({ displayName: 1 })
      .lean()
      .exec();
    const activeStatuses: TaskStatus[] = [
      "created",
      "planning",
      "capability_resolved",
      "ens_checking",
      "ens_authorized",
      "policy_checking",
      "policy_authorized",
      "executing",
    ];
    const [activeTasks, authorizedActions, blockedActions, recentActivity] =
      await Promise.all([
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
        this.activities
          .find({ organizationId: organization._id })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean()
          .exec(),
      ]);
    return {
      exists: true,
      complete:
        organization.onboardingStatus === "complete" && agents.length > 0,
      organization: {
        id: organization._id.toString(),
        name: organization.name,
        ensName: organization.ensName,
        ownerWallet: organization.ownerWallet,
        website: organization.website ?? "",
        industry: organization.industry ?? "",
        onboardingStatus: organization.onboardingStatus,
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
          role: agent.intendedRole,
          capability: agent.intendedCapabilities?.[0],
          policyVersion: agent.intendedPolicyVersion,
          provisioningStatus: agent.provisioningStatus,
        })),
      },
    };
  }

  async upsertForOwner(
    ownerWallet: Address,
    input: {
      name: string;
      ensName: string;
      website?: string;
      industry?: string;
      agents: Array<{
        displayName: string;
        ensName: string;
        wallet: string;
        role: "procurement" | "travel";
        capability: "procurement.purchase" | "travel.booking";
        policyVersion: string;
      }>;
    },
  ) {
    const normalizedOwner = ownerWallet.toLowerCase();
    const ensName = this.normalizeEns(input.ensName);
    const agents = input.agents.map((agent) => ({
      displayName: agent.displayName.trim(),
      ensName: this.normalizeEns(agent.ensName),
      wallet: this.normalizeWallet(agent.wallet),
      intendedRole: agent.role,
      intendedCapabilities: [agent.capability],
      intendedPolicyVersion: agent.policyVersion.trim(),
      provisioningStatus: "pending_ens" as const,
    }));
    if (new Set(agents.map((agent) => agent.ensName)).size !== agents.length) {
      throw new ConflictException("Agent ENS names must be unique");
    }
    for (const agent of agents) {
      const expectedCapability =
        agent.intendedRole === "procurement"
          ? "procurement.purchase"
          : "travel.booking";
      if (agent.intendedCapabilities[0] !== expectedCapability) {
        throw new ConflictException(
          `Capability does not match the intended role for ${agent.ensName}`,
        );
      }
    }
    for (const agent of agents) {
      if (!agent.ensName.endsWith(`.${ensName}`)) {
        throw new ConflictException(
          `${agent.ensName} must be a subname of ${ensName}`,
        );
      }
    }
    const ensOwner = await this.organizations
      .findOne({ ensName, ownerWallet: { $ne: normalizedOwner } })
      .lean()
      .exec();
    if (ensOwner) {
      throw new ConflictException(
        "That ENS namespace belongs to another LATCH organization",
      );
    }
    const conflictingAgent = await this.agents.findOne({
      ensName: { $in: agents.map((agent) => agent.ensName) },
      organizationId: {
        $nin: await this.organizations
          .find({ ownerWallet: ownerWallet.toLowerCase() })
          .distinct("_id"),
      },
    });
    if (conflictingAgent) {
      throw new ConflictException(
        `${conflictingAgent.ensName} is already registered to another organization`,
      );
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
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    if (!organization)
      throw new ConflictException("Onboarding could not be saved");

    await Promise.all(
      agents.map((agent) =>
        this.agents.findOneAndUpdate(
          { ensName: agent.ensName },
          { $set: { ...agent, organizationId: organization._id } },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        ),
      ),
    );
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
