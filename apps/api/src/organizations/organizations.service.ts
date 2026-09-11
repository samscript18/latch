import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import type { TaskStatus } from "@latch/shared";
import type { Model } from "mongoose";
import type { Environment } from "../config/environment.js";
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
    @Inject(ConfigService)
    private readonly config: ConfigService<Environment, true>,
  ) {}

  async getDemoOrganization() {
    const ensName = this.config.get("DEMO_ORG_ENS", { infer: true });
    if (!ensName)
      throw new NotFoundException(
        "Demo organization ENS name is not configured",
      );
    const organization = await this.organizations
      .findOne({ ensName: ensName.toLowerCase() })
      .exec();
    if (!organization)
      throw new NotFoundException("Demo organization has not been seeded");
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
    const [
      agentCount,
      activeTasks,
      authorizedActions,
      blockedActions,
      recentActivity,
    ] = await Promise.all([
      this.agents.countDocuments({ organizationId: organization._id }),
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
      id: organization._id.toString(),
      name: organization.name,
      ensName: organization.ensName,
      ownerWallet: organization.ownerWallet,
      metrics: { agentCount, activeTasks, authorizedActions, blockedActions },
      recentActivity,
    };
  }
}
