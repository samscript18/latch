import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
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
import { EnsAdminService } from "../ens/ens-admin.service.js";
import { EnsService } from "../ens/ens.service.js";
import type { AgentType, EnsAgentIdentity } from "@latch/shared";
import { getAgentTypeDefinition } from "./agent-type.registry.js";

@Injectable()
export class AgentsService {
  constructor(
    @InjectModel(Agent.name) private readonly agents: Model<AgentDocument>,
    @InjectModel(Organization.name)
    private readonly organizations: Model<OrganizationDocument>,
    @InjectModel(Activity.name)
    private readonly activities: Model<ActivityDocument>,
    @Inject(EnsService) private readonly ens: EnsService,
    @Inject(EnsAdminService) private readonly ensAdmin: EnsAdminService,
  ) {}

  async list() {
    const agents = await this.agents.find().sort({ displayName: 1 }).exec();
    return Promise.all(agents.map((agent) => this.toFreshView(agent)));
  }

  async listForOwner(ownerWallet: Address) {
    const organization = await this.organizations
      .findOne({ ownerWallet: ownerWallet.toLowerCase() })
      .lean()
      .exec();
    if (!organization) return [];
    const agents = await this.agents
      .find({
        organizationId: organization._id,
        intendedRole: { $in: ["procurement", "research"] },
      })
      .sort({ displayName: 1 })
      .exec();
    return Promise.all(agents.map((agent) => this.toFreshView(agent)));
  }

  async createForOwner(
    ownerWallet: Address,
    input: { type: AgentType; ensName: string; wallet: string },
  ) {
    const organization = await this.organizations
      .findOne({ ownerWallet: ownerWallet.toLowerCase() })
      .exec();
    if (!organization) {
      throw new NotFoundException("Complete organization setup first");
    }
    const ensName = this.normalizeName(input.ensName);
    if (!ensName.endsWith(`.${organization.ensName}`)) {
      throw new ConflictException(
        `${ensName} must be a subname of ${organization.ensName}`,
      );
    }
    if (!isAddress(input.wallet, { strict: false })) {
      throw new ConflictException("Invalid agent wallet");
    }
    const template = getAgentTypeDefinition(input.type);
    const existing = await this.agents.findOne({ ensName }).lean().exec();
    if (existing) {
      throw new ConflictException("That ENS identity is already registered");
    }
    const agent = await this.agents.create({
      displayName: template.displayName,
      ensName,
      wallet: getAddress(input.wallet).toLowerCase(),
      organizationId: organization._id,
      intendedRole: template.role,
      intendedCapabilities: [...template.capabilities],
      intendedPolicyVersion: template.policyVersion,
      provisioningStatus: "pending_ens",
    });
    return this.serialize(agent, null, false);
  }

  async findByEnsName(unsafeName: string) {
    const name = this.normalizeName(unsafeName);
    const agent = await this.agents.findOne({ ensName: name }).exec();
    if (!agent) throw new NotFoundException("Agent not found");
    if (
      agent.intendedRole !== "procurement" &&
      agent.intendedRole !== "research"
    ) {
      throw new NotFoundException("Agent type is not supported by this MVP");
    }
    return this.toFreshView(agent);
  }

  async revoke(unsafeName: string, actingWallet: Address) {
    const name = this.normalizeName(unsafeName);
    const agent = await this.agents.findOne({ ensName: name }).exec();
    if (!agent) throw new NotFoundException("Agent not found");
    const organization = await this.organizations
      .findById(agent.organizationId)
      .exec();
    if (!organization)
      throw new NotFoundException("Agent organization not found");
    if (getAddress(organization.ownerWallet) !== getAddress(actingWallet)) {
      throw new UnauthorizedException("Organization owner wallet required");
    }

    const result = await this.ensAdmin.revokeAgent(
      name,
      getAddress(agent.wallet),
    );
    await this.saveSnapshot(agent, result.identity);
    await this.activities.create({
      organizationId: organization._id,
      agentId: agent._id,
      type: "AGENT_REVOKED",
      result: "succeeded",
      message: "Agent authority was revoked through ENS.",
      publicMetadata: { transactionHash: result.transactionHash },
    });
    return {
      transactionHash: result.transactionHash,
      agent: this.serialize(agent, result.identity, true),
    };
  }

  private async toFreshView(agent: AgentDocument) {
    const recentActivity = await this.recentActivity(agent);
    try {
      const identity = await this.ens.resolveAgent(agent.ensName);
      await this.saveSnapshot(agent, identity);
      const verified = Boolean(
        identity.wallet &&
        identity.resolver &&
        identity.role &&
        identity.status &&
        identity.organization &&
        identity.policyVersion &&
        identity.capabilities.length > 0 &&
        identity.wallet.toLowerCase() === agent.wallet.toLowerCase(),
      );
      if (verified && agent.provisioningStatus !== "verified") {
        agent.provisioningStatus = "verified";
        await agent.save();
      }
      return this.serialize(agent, identity, verified, recentActivity);
    } catch {
      return this.serialize(agent, null, false, recentActivity);
    }
  }

  private async recentActivity(agent: AgentDocument) {
    const rows = await this.activities
      .find({ agentId: agent._id })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean()
      .exec();
    return rows.map((row) => ({
      id: row._id.toString(),
      type: row.type,
      result: row.result,
      message: row.message,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  private async saveSnapshot(
    agent: AgentDocument,
    identity: EnsAgentIdentity,
  ): Promise<void> {
    agent.lastEnsSnapshot = {
      capabilities: identity.capabilities,
      organization: identity.organization ?? undefined,
      policyVersion: identity.policyVersion ?? undefined,
      resolver: identity.resolver ?? undefined,
      role: identity.role ?? undefined,
      status: identity.status ?? undefined,
    };
    agent.lastEnsBlock = identity.checkedAtBlock?.toString();
    agent.lastEnsCheckedAt = new Date();
    await agent.save();
  }

  private serialize(
    agent: AgentDocument,
    identity: EnsAgentIdentity | null,
    ensVerified: boolean,
    recentActivity: Array<{
      id: string;
      type: string;
      result: string;
      message: string;
      createdAt: string;
    }> = [],
  ) {
    return {
      id: agent._id.toString(),
      displayName: agent.displayName,
      ensName: agent.ensName,
      expectedWallet: agent.wallet,
      organizationId: agent.organizationId.toString(),
      intendedRole: agent.intendedRole ?? null,
      intendedCapabilities: agent.intendedCapabilities ?? [],
      intendedPolicyVersion: agent.intendedPolicyVersion ?? null,
      provisioningStatus: ensVerified
        ? "verified"
        : (agent.provisioningStatus ?? "pending_ens"),
      ensVerified,
      identity: identity
        ? {
            ...identity,
            checkedAtBlock: identity.checkedAtBlock?.toString(),
          }
        : null,
      lastEnsCheckedAt: ensVerified
        ? agent.lastEnsCheckedAt?.toISOString()
        : null,
      recentActivity,
    };
  }

  private normalizeName(unsafeName: string): string {
    try {
      return normalize(decodeURIComponent(unsafeName).trim());
    } catch {
      throw new ServiceUnavailableException("Invalid ENS name");
    }
  }
}
