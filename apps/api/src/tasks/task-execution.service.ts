import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { publicDenialMessages, type TaskStatus } from "@latch/shared";
import type { Model } from "mongoose";
import { AuditService } from "../audit/audit.service.js";
import { AuthorizationOrchestrator } from "../authorization/authorization.orchestrator.js";
import { capabilityRegistry } from "../capabilities/capability-registry.js";
import {
  CAPABILITY_PROVIDER,
  type CapabilityProvider,
  type ProductCandidate,
} from "../capabilities/capability-provider.interface.js";
import {
  ActionRequest,
  type ActionRequestDocument,
} from "../database/schemas/action-request.schema.js";
import {
  Activity,
  type ActivityDocument,
} from "../database/schemas/activity.schema.js";
import { Agent, type AgentDocument } from "../database/schemas/agent.schema.js";
import { Task, type TaskDocument } from "../database/schemas/task.schema.js";
import {
  TASK_PLANNER,
  type TaskPlanner,
} from "../planning/task-planner.interface.js";

const validTransitions: Record<TaskStatus, readonly TaskStatus[]> = {
  created: ["planning"],
  planning: ["capability_resolved", "failed"],
  capability_resolved: ["ens_checking", "blocked", "failed"],
  ens_checking: ["ens_authorized", "blocked", "failed"],
  ens_authorized: ["policy_checking", "failed"],
  policy_checking: ["policy_authorized", "blocked", "failed"],
  policy_authorized: ["executing", "failed"],
  executing: ["succeeded", "failed"],
  succeeded: [],
  blocked: [],
  failed: [],
};

@Injectable()
export class TaskExecutionService {
  constructor(
    @InjectModel(Task.name) private readonly tasks: Model<TaskDocument>,
    @InjectModel(Agent.name) private readonly agents: Model<AgentDocument>,
    @InjectModel(ActionRequest.name)
    private readonly actions: Model<ActionRequestDocument>,
    @InjectModel(Activity.name)
    private readonly activities: Model<ActivityDocument>,
    @Inject(TASK_PLANNER) private readonly planner: TaskPlanner,
    @Inject(CAPABILITY_PROVIDER)
    private readonly capability: CapabilityProvider,
    @Inject(AuthorizationOrchestrator)
    private readonly authorization: AuthorizationOrchestrator,
    @Inject(AuditService)
    private readonly audit: AuditService,
  ) {}

  async create(agentEnsName: string, prompt: string) {
    const agent = await this.agents
      .findOne({ ensName: agentEnsName.toLowerCase() })
      .exec();
    if (!agent) throw new NotFoundException("Agent not found");
    const task = await this.tasks.create({
      organizationId: agent.organizationId,
      agentId: agent._id,
      prompt,
      status: "created",
      actionVersion: 1,
    });
    await this.record(task, agent, "TASK_CREATED", "started", "Task created.");
    return this.serializeTask(task);
  }

  async run(taskId: string) {
    const task = await this.tasks.findOneAndUpdate(
      { _id: taskId, status: "created" },
      { $set: { status: "planning" } },
      { new: true },
    );
    if (!task) {
      const existing = await this.tasks.findById(taskId).exec();
      if (!existing) throw new NotFoundException("Task not found");
      throw new ConflictException("This task version has already been run");
    }
    const agent = await this.agents.findById(task.agentId).exec();
    if (!agent) return this.fail(task, null, "Task agent no longer exists");
    let action: ActionRequestDocument | null = null;

    try {
      const plan = await this.planner.plan(task.prompt);
      task.requestedCapability = plan.capability;
      await this.transition(task, "capability_resolved");
      await this.record(
        task,
        agent,
        "CAPABILITY_RESOLVED",
        "started",
        "Approved capability selected from the registry.",
        { capability: plan.capability },
      );

      if (!capabilityRegistry[plan.capability].executable) {
        await this.transition(task, "blocked");
        await this.record(
          task,
          agent,
          "CAPABILITY_BLOCKED",
          "blocked",
          publicDenialMessages.CAPABILITY_UNAVAILABLE,
          { code: "CAPABILITY_UNAVAILABLE" },
        );
        return this.result(task, null, false, "CAPABILITY_UNAVAILABLE");
      }

      const product = await this.selectProduct(plan.productQuery);
      const totalAmountCents = product.unitPriceCents * plan.quantity;
      const authorizationId = `${task._id.toString()}:v${task.actionVersion}`;
      const proposedAction = await this.actions.create({
        taskId: task._id,
        agentId: agent._id,
        actionType: plan.capability,
        quantity: plan.quantity,
        item: product.name,
        vendor: product.vendor,
        amountCents: totalAmountCents,
        ensAuthorized: false,
        policyAuthorized: false,
        status: "proposed",
        authorizationId,
        consumed: false,
      });
      action = proposedAction;

      const requestedAuditHash = await this.audit.recordRequested({
        taskId: task._id.toString(),
        agentName: agent.ensName,
        capability: plan.capability,
        amountCents: totalAmountCents,
      });

      await this.transition(task, "ens_checking");
      await this.record(
        task,
        agent,
        "ENS_CHECKING",
        "started",
        "Verifying agent authority from fresh ENS records.",
        {
          capability: plan.capability,
          ...(requestedAuditHash
            ? { auditTransactionHash: requestedAuditHash }
            : {}),
        },
        proposedAction,
      );
      const verdict = await this.authorization.authorize(
        {
          taskId: task._id.toString(),
          agentName: agent.ensName,
          agentWallet: agent.wallet as `0x${string}`,
          capability: plan.capability,
          vendor: product.vendor,
          amountCents: totalAmountCents,
        },
        async (stage) => {
          await this.transition(task, stage);
          if (stage === "ens_authorized") {
            await this.record(
              task,
              agent,
              "ENS_AUTHORIZED",
              "authorized",
              "ENS identity and organizational authority verified.",
              { capability: plan.capability },
              proposedAction,
            );
            return;
          }
          await this.record(
            task,
            agent,
            "POLICY_CHECKING",
            "started",
            "Evaluating the proposed action with confidential policy.",
            { policyVersion: "ens-derived" },
            proposedAction,
          );
        },
      );

      proposedAction.ensAuthorized = verdict.stage === "policy";
      if (!verdict.authorized) {
        const denialCode = verdict.code ?? "EXECUTION_FAILED";
        const blockedAuditHash = await this.audit.recordBlocked({
          taskId: task._id.toString(),
          agentName: agent.ensName,
          reasonCode: denialCode,
        });
        proposedAction.publicDenialCode = denialCode;
        proposedAction.status = "blocked";
        await proposedAction.save();
        await this.transition(task, "blocked");
        await this.record(
          task,
          agent,
          "AUTHORIZATION_BLOCKED",
          "blocked",
          verdict.message,
          {
            code: denialCode,
            stage: verdict.stage,
            ...(blockedAuditHash
              ? { auditTransactionHash: blockedAuditHash }
              : {}),
          },
          proposedAction,
        );
        return this.result(task, proposedAction, false, denialCode);
      }

      if (!verdict.policyVersion) {
        throw new Error("Authorized policy verdict omitted its version");
      }
      const authorizedAuditHash = await this.audit.recordAuthorized({
        taskId: task._id.toString(),
        agentName: agent.ensName,
        policyVersion: verdict.policyVersion,
      });
      proposedAction.policyAuthorized = true;
      proposedAction.policyVersion = verdict.policyVersion;
      proposedAction.status = "authorized";
      await proposedAction.save();
      await this.transition(task, "policy_authorized");
      await this.record(
        task,
        agent,
        "POLICY_AUTHORIZED",
        "authorized",
        "Confidential policy approved the proposed action.",
        authorizedAuditHash
          ? { auditTransactionHash: authorizedAuditHash }
          : {},
        proposedAction,
      );
      await this.transition(task, "executing");
      await this.record(
        task,
        agent,
        "CAPABILITY_EXECUTION_STARTED",
        "started",
        "Executing the exact authorized action through the capability provider.",
        { provider: "configured-capability-provider" },
        proposedAction,
      );

      let execution;
      try {
        execution = await this.capability.executePurchase({
          taskId: task._id.toString(),
          authorizationId,
          capability: plan.capability,
          product,
          quantity: plan.quantity,
          totalAmountCents,
        });
      } catch {
        await this.audit.recordBlocked({
          taskId: task._id.toString(),
          agentName: agent.ensName,
          reasonCode: "CAPABILITY_UNAVAILABLE",
        });
        proposedAction.publicDenialCode = "CAPABILITY_UNAVAILABLE";
        proposedAction.status = "failed";
        await proposedAction.save();
        return this.fail(
          task,
          agent,
          "Authorized, but capability execution is unavailable. No action was performed.",
          proposedAction,
          "CAPABILITY_UNAVAILABLE",
        );
      }
      const executedAuditHash = await this.audit.recordExecuted({
        taskId: task._id.toString(),
        agentName: agent.ensName,
        executionReference: execution.executionReference,
      });
      proposedAction.executionReference = execution.executionReference;
      proposedAction.transactionHash = execution.transactionHash;
      proposedAction.status = "consumed";
      proposedAction.consumed = true;
      await proposedAction.save();
      await this.transition(task, "succeeded");
      await this.record(
        task,
        agent,
        "ACTION_EXECUTED",
        "succeeded",
        "Approved action executed.",
        {
          executionReference: execution.executionReference,
          provider: execution.provider,
          ...(executedAuditHash
            ? { auditTransactionHash: executedAuditHash }
            : {}),
        },
        proposedAction,
      );
      return this.result(task, proposedAction, true);
    } catch {
      if (
        action &&
        action.status !== "blocked" &&
        action.status !== "consumed"
      ) {
        action.publicDenialCode = "EXECUTION_FAILED";
        action.status = "failed";
        await Promise.resolve(action.save()).catch(() => undefined);
      }
      return this.fail(
        task,
        agent,
        publicDenialMessages.EXECUTION_FAILED,
        action,
      );
    }
  }

  async list() {
    const tasks = await this.tasks
      .find()
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();
    return tasks.map((task) => this.serializeTask(task));
  }

  async findOne(taskId: string) {
    const task = await this.tasks.findById(taskId).exec();
    if (!task) throw new NotFoundException("Task not found");
    const action = await this.actions.findOne({ taskId: task._id }).exec();
    return this.result(
      task,
      action,
      task.status === "succeeded",
      action?.publicDenialCode,
    );
  }

  async activity(taskId: string) {
    return this.activities
      .find({ taskId })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
  }

  private async selectProduct(query: string): Promise<ProductCandidate> {
    const products = await this.capability.searchProducts(query);
    const product = products[0];
    if (!product)
      throw new BadRequestException("No product candidate was returned");
    return product;
  }

  private async transition(
    task: TaskDocument,
    next: TaskStatus,
  ): Promise<void> {
    if (!validTransitions[task.status].includes(next)) {
      throw new ConflictException(
        `Invalid task transition: ${task.status} -> ${next}`,
      );
    }
    task.status = next;
    await task.save();
  }

  private async fail(
    task: TaskDocument,
    agent: AgentDocument | null,
    message: string,
    action: ActionRequestDocument | null = null,
    code: "EXECUTION_FAILED" | "CAPABILITY_UNAVAILABLE" = "EXECUTION_FAILED",
  ) {
    if (validTransitions[task.status].includes("failed"))
      await this.transition(task, "failed");
    if (agent)
      await this.record(
        task,
        agent,
        "TASK_FAILED",
        "failed",
        message,
        {},
        action ?? undefined,
      );
    return this.result(task, action, false, code);
  }

  private record(
    task: TaskDocument,
    agent: AgentDocument,
    type: string,
    result: "started" | "authorized" | "blocked" | "failed" | "succeeded",
    message: string,
    publicMetadata: Record<string, unknown> = {},
    action?: ActionRequestDocument,
  ) {
    return this.activities.create({
      organizationId: task.organizationId,
      agentId: agent._id,
      taskId: task._id,
      actionRequestId: action?._id,
      type,
      result,
      message,
      publicMetadata,
    });
  }

  private result(
    task: TaskDocument,
    action: ActionRequestDocument | null,
    succeeded: boolean,
    code?: string,
  ) {
    return {
      task: this.serializeTask(task),
      action: action
        ? {
            id: action._id.toString(),
            actionType: action.actionType,
            quantity: action.quantity,
            item: action.item,
            vendor: action.vendor,
            amountCents: action.amountCents,
            ensAuthorized: action.ensAuthorized,
            policyAuthorized: action.policyAuthorized,
            status: action.status,
            executionReference: action.executionReference,
          }
        : null,
      succeeded,
      code,
    };
  }

  private serializeTask(task: TaskDocument) {
    return {
      id: task._id.toString(),
      organizationId: task.organizationId.toString(),
      agentId: task.agentId.toString(),
      prompt: task.prompt,
      status: task.status,
      requestedCapability: task.requestedCapability,
      actionVersion: task.actionVersion,
      createdAt: task.createdAt?.toISOString(),
      updatedAt: task.updatedAt?.toISOString(),
    };
  }
}
