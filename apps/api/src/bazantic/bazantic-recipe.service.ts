import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { keccak256, stringToHex } from "viem";
import { AuditService } from "../audit/audit.service.js";
import { AuthorizationOrchestrator } from "../authorization/authorization.orchestrator.js";
import { markIntegrationSuccess } from "../common/integration-telemetry.js";
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

interface CatalogProposal {
  recipeInvocationId: string;
  agentEnsName: string;
  prompt: string;
  capability: "procurement.purchase";
  product: {
    id: string;
    name: string;
    vendor: string;
    unitPriceCents: number;
    currency: "USD";
  };
  quantity: number;
}

interface ExecutionReceipt {
  proposalDigest: string;
  executionReference: string;
  transactionHash?: string;
}

@Injectable()
export class BazanticRecipeService {
  constructor(
    @InjectModel(Task.name) private readonly tasks: Model<TaskDocument>,
    @InjectModel(Agent.name) private readonly agents: Model<AgentDocument>,
    @InjectModel(ActionRequest.name)
    private readonly actions: Model<ActionRequestDocument>,
    @InjectModel(Activity.name)
    private readonly activities: Model<ActivityDocument>,
    @Inject(AuthorizationOrchestrator)
    private readonly authorization: AuthorizationOrchestrator,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async createProposal(input: CatalogProposal) {
    const authorizationId = `recipe:${input.recipeInvocationId}`;
    const amountCents = input.product.unitPriceCents * input.quantity;
    const proposalDigest = this.digest(input, amountCents);
    const existing = await this.actions.findOne({ authorizationId }).exec();
    if (existing) {
      if (existing.proposalDigest !== proposalDigest) {
        throw new ConflictException(
          "Recipe invocation ID is already bound to another proposal",
        );
      }
      return this.proposalResponse(existing);
    }

    const agent = await this.agents
      .findOne({ ensName: input.agentEnsName.toLowerCase() })
      .exec();
    if (!agent) throw new NotFoundException("Agent not found");

    const task = await this.tasks.create({
      organizationId: agent.organizationId,
      agentId: agent._id,
      prompt: input.prompt,
      status: "capability_resolved",
      requestedCapability: input.capability,
      actionVersion: 1,
    });
    const action = await this.actions.create({
      taskId: task._id,
      agentId: agent._id,
      actionType: input.capability,
      quantity: input.quantity,
      item: input.product.name,
      vendor: input.product.vendor,
      amountCents,
      productId: input.product.id,
      currency: input.product.currency,
      source: "bazantic-recipe",
      proposalDigest,
      ensAuthorized: false,
      policyAuthorized: false,
      status: "proposed",
      authorizationId,
      consumed: false,
    });
    await this.record(
      task,
      agent,
      action,
      "RECIPE_PROPOSAL_CREATED",
      "started",
      "Bazantic Recipe submitted a catalog-derived proposal.",
      { capability: input.capability, proposalDigest },
    );
    markIntegrationSuccess("bazantic");
    return this.proposalResponse(action);
  }

  async evaluate(authorizationId: string) {
    const action = await this.actions.findOneAndUpdate(
      {
        authorizationId,
        source: "bazantic-recipe",
        status: "proposed",
      },
      { $set: { status: "authorizing" } },
      { new: true },
    );
    if (!action) {
      const existing = await this.actions.findOne({ authorizationId }).exec();
      if (!existing) throw new NotFoundException("Proposal not found");
      throw new ConflictException(
        "This proposal already has an authorization decision",
      );
    }

    const [task, agent] = await Promise.all([
      this.tasks.findById(action.taskId).exec(),
      this.agents.findById(action.agentId).exec(),
    ]);
    if (!task || !agent)
      throw new NotFoundException("Proposal context missing");

    try {
      const requestedHash = await this.audit.recordRequested({
        taskId: task._id.toString(),
        agentName: agent.ensName,
        capability: action.actionType,
        amountCents: action.amountCents,
      });
      task.status = "ens_checking";
      await task.save();
      await this.record(
        task,
        agent,
        action,
        "ENS_CHECKING",
        "started",
        "Verifying Recipe proposal authority from fresh ENS records.",
        requestedHash ? { auditTransactionHash: requestedHash } : {},
      );

      const verdict = await this.authorization.authorize(
        {
          taskId: task._id.toString(),
          agentName: agent.ensName,
          agentWallet: agent.wallet as `0x${string}`,
          capability: "procurement.purchase",
          vendor: action.vendor,
          amountCents: action.amountCents,
        },
        async (stage) => {
          task.status = stage;
          await task.save();
          await this.record(
            task,
            agent,
            action,
            stage === "ens_authorized" ? "ENS_AUTHORIZED" : "POLICY_CHECKING",
            stage === "ens_authorized" ? "authorized" : "started",
            stage === "ens_authorized"
              ? "ENS identity and organizational authority verified."
              : "Evaluating the immutable proposal with confidential policy.",
          );
        },
      );

      action.ensAuthorized = verdict.stage === "policy";
      if (!verdict.authorized) {
        const code = verdict.code ?? "EXECUTION_FAILED";
        const blockedHash = await this.audit.recordBlocked({
          taskId: task._id.toString(),
          agentName: agent.ensName,
          reasonCode: code,
        });
        action.publicDenialCode = code;
        action.status = "blocked";
        task.status = "blocked";
        await Promise.all([action.save(), task.save()]);
        await this.record(
          task,
          agent,
          action,
          "AUTHORIZATION_BLOCKED",
          "blocked",
          verdict.message,
          {
            code,
            ...(blockedHash ? { auditTransactionHash: blockedHash } : {}),
          },
        );
        markIntegrationSuccess("bazantic");
        return this.verdictResponse(action, false, code, verdict.message);
      }

      if (!verdict.policyVersion)
        throw new Error("Authorized policy verdict omitted its version");
      const authorizedHash = await this.audit.recordAuthorized({
        taskId: task._id.toString(),
        agentName: agent.ensName,
        policyVersion: verdict.policyVersion,
      });
      action.policyAuthorized = true;
      action.policyVersion = verdict.policyVersion;
      action.status = "authorized";
      task.status = "policy_authorized";
      await Promise.all([action.save(), task.save()]);
      await this.record(
        task,
        agent,
        action,
        "POLICY_AUTHORIZED",
        "authorized",
        "ENS and confidential policy checks approved the Recipe proposal.",
        authorizedHash ? { auditTransactionHash: authorizedHash } : {},
      );
      markIntegrationSuccess("bazantic");
      return this.verdictResponse(
        action,
        true,
        undefined,
        "The exact catalog proposal is authorized for execution.",
      );
    } catch {
      action.publicDenialCode = "EXECUTION_FAILED";
      action.status = "failed";
      task.status = "failed";
      await Promise.allSettled([action.save(), task.save()]);
      return this.verdictResponse(
        action,
        false,
        "EXECUTION_FAILED",
        "Authorization could not be completed. No action may be executed.",
      );
    }
  }

  async completeExecution(authorizationId: string, receipt: ExecutionReceipt) {
    const existing = await this.actions.findOne({ authorizationId }).exec();
    if (!existing) throw new NotFoundException("Proposal not found");
    if (existing.proposalDigest !== receipt.proposalDigest) {
      throw new ConflictException("Execution receipt does not match proposal");
    }
    if (existing.status === "consumed") {
      if (existing.executionReference !== receipt.executionReference) {
        throw new ConflictException("Proposal already has another execution");
      }
      return this.executionResponse(existing);
    }
    if (existing.status !== "authorized") {
      throw new ConflictException("Proposal is not authorized for execution");
    }

    const action = await this.actions.findOneAndUpdate(
      { _id: existing._id, status: "authorized" },
      {
        $set: {
          status: "executing",
          executionReference: receipt.executionReference,
          transactionHash: receipt.transactionHash,
        },
      },
      { new: true },
    );
    if (!action)
      throw new ConflictException("Execution is already being recorded");
    const [task, agent] = await Promise.all([
      this.tasks.findById(action.taskId).exec(),
      this.agents.findById(action.agentId).exec(),
    ]);
    if (!task || !agent)
      throw new NotFoundException("Proposal context missing");

    task.status = "executing";
    await task.save();
    try {
      const auditHash = await this.audit.recordExecuted({
        taskId: task._id.toString(),
        agentName: agent.ensName,
        executionReference: receipt.executionReference,
      });
      action.status = "consumed";
      action.consumed = true;
      task.status = "succeeded";
      await Promise.all([action.save(), task.save()]);
      await this.record(
        task,
        agent,
        action,
        "ACTION_EXECUTED",
        "succeeded",
        "Bazantic Recipe reported exact authorized execution.",
        {
          executionReference: receipt.executionReference,
          ...(auditHash ? { auditTransactionHash: auditHash } : {}),
        },
      );
      markIntegrationSuccess("bazantic");
      return this.executionResponse(action);
    } catch (error) {
      action.status = "authorized";
      action.executionReference = undefined;
      action.transactionHash = undefined;
      task.status = "policy_authorized";
      await Promise.allSettled([action.save(), task.save()]);
      throw error;
    }
  }

  private digest(input: CatalogProposal, amountCents: number): `0x${string}` {
    return keccak256(
      stringToHex(
        JSON.stringify([
          input.recipeInvocationId,
          input.agentEnsName.toLowerCase(),
          input.capability,
          input.product.id,
          input.product.name,
          input.product.vendor,
          input.product.unitPriceCents,
          input.product.currency,
          input.quantity,
          amountCents,
        ]),
      ),
    );
  }

  private proposalResponse(action: ActionRequestDocument) {
    return {
      taskId: action.taskId.toString(),
      authorizationId: action.authorizationId,
      proposalDigest: action.proposalDigest,
      status: action.status,
      proposal: {
        capability: action.actionType,
        productId: action.productId,
        name: action.item,
        vendor: action.vendor,
        unitPriceCents: action.amountCents / action.quantity,
        quantity: action.quantity,
        amountCents: action.amountCents,
        currency: action.currency,
      },
    };
  }

  private verdictResponse(
    action: ActionRequestDocument,
    authorized: boolean,
    code: string | undefined,
    message: string,
  ) {
    return {
      ...this.proposalResponse(action),
      authorized,
      code,
      message,
    };
  }

  private executionResponse(action: ActionRequestDocument) {
    return {
      taskId: action.taskId.toString(),
      authorizationId: action.authorizationId,
      proposalDigest: action.proposalDigest,
      status: action.status,
      executionReference: action.executionReference,
      transactionHash: action.transactionHash,
    };
  }

  private record(
    task: TaskDocument,
    agent: AgentDocument,
    action: ActionRequestDocument,
    type: string,
    result: "started" | "authorized" | "blocked" | "failed" | "succeeded",
    message: string,
    publicMetadata: Record<string, unknown> = {},
  ) {
    return this.activities.create({
      organizationId: task.organizationId,
      agentId: agent._id,
      taskId: task._id,
      actionRequestId: action._id,
      type,
      result,
      message,
      publicMetadata,
    });
  }
}
