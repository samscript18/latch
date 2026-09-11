import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import type { Model, Types } from "mongoose";
import type { Environment } from "../config/environment.js";
import {
  Activity,
  type ActivityDocument,
} from "../database/schemas/activity.schema.js";
import {
  Organization,
  type OrganizationDocument,
} from "../database/schemas/organization.schema.js";

interface ActivityProjection {
  _id: Types.ObjectId;
  result: string;
  message: string;
  createdAt: Date;
  agent?: { ensName?: string };
  task?: { prompt?: string; requestedCapability?: string };
  action?: {
    ensAuthorized?: boolean;
    policyAuthorized?: boolean;
    status?: string;
  };
}

@Injectable()
export class ActivityService {
  constructor(
    @InjectModel(Activity.name)
    private readonly activities: Model<ActivityDocument>,
    @InjectModel(Organization.name)
    private readonly organizations: Model<OrganizationDocument>,
    @Inject(ConfigService)
    private readonly config: ConfigService<Environment, true>,
  ) {}

  async list() {
    const organization = await this.organizations
      .findOne({
        ensName: this.config
          .get("DEMO_ORG_ENS", { infer: true })
          ?.toLowerCase(),
      })
      .exec();
    if (!organization)
      throw new NotFoundException("Demo organization has not been seeded");

    const rows = await this.activities
      .aggregate<ActivityProjection>([
        {
          $match: {
            organizationId: organization._id,
            type: {
              $in: [
                "ACTION_EXECUTED",
                "AUTHORIZATION_BLOCKED",
                "CAPABILITY_BLOCKED",
                "TASK_FAILED",
              ],
            },
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 100 },
        {
          $lookup: {
            from: "agents",
            localField: "agentId",
            foreignField: "_id",
            as: "agent",
          },
        },
        { $unwind: { path: "$agent", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "tasks",
            localField: "taskId",
            foreignField: "_id",
            as: "task",
          },
        },
        { $unwind: { path: "$task", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "action_requests",
            localField: "actionRequestId",
            foreignField: "_id",
            as: "action",
          },
        },
        { $unwind: { path: "$action", preserveNullAndEmptyArrays: true } },
      ])
      .exec();

    return rows.map((row) => ({
      id: row._id.toString(),
      outcome: this.outcome(row),
      agent: row.agent?.ensName ?? "Unknown agent",
      task: row.task?.prompt ?? "Task unavailable",
      capability: row.task?.requestedCapability ?? null,
      ensResult: this.ensResult(row),
      policyResult: this.policyResult(row),
      executionResult: this.executionResult(row),
      message: row.message,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  private outcome(row: ActivityProjection) {
    if (row.action?.status === "consumed") return "AUTHORIZED";
    if (row.result === "failed") return "FAILED";
    return "BLOCKED";
  }

  private ensResult(row: ActivityProjection) {
    if (!row.action) return "not_run";
    return row.action.ensAuthorized ? "passed" : "failed";
  }

  private policyResult(row: ActivityProjection) {
    if (!row.action?.ensAuthorized) return "not_run";
    return row.action.policyAuthorized ? "passed" : "failed";
  }

  private executionResult(row: ActivityProjection) {
    if (!row.action?.policyAuthorized) return "not_run";
    return row.action.status === "consumed" ? "passed" : "failed";
  }
}
