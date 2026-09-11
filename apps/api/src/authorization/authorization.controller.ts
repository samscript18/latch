import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Inject,
  NotFoundException,
  Post,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { z } from "zod";
import {
  ActionRequest,
  type ActionRequestDocument,
} from "../database/schemas/action-request.schema.js";
import { Agent, type AgentDocument } from "../database/schemas/agent.schema.js";
import { Task, type TaskDocument } from "../database/schemas/task.schema.js";
import { AuthorizationOrchestrator } from "./authorization.orchestrator.js";

const evaluationRequestSchema = z
  .object({ authorizationId: z.string().min(1).max(256) })
  .strict();

@Controller("authorization")
export class AuthorizationController {
  constructor(
    @Inject(AuthorizationOrchestrator)
    private readonly orchestrator: AuthorizationOrchestrator,
    @InjectModel(ActionRequest.name)
    private readonly actions: Model<ActionRequestDocument>,
    @InjectModel(Task.name) private readonly tasks: Model<TaskDocument>,
    @InjectModel(Agent.name) private readonly agents: Model<AgentDocument>,
  ) {}

  @Post("evaluate")
  async evaluate(@Body() body: unknown) {
    const request = evaluationRequestSchema.safeParse(body);
    if (!request.success)
      throw new BadRequestException("A valid authorization ID is required");
    const action = await this.actions.findOneAndUpdate(
      {
        authorizationId: request.data.authorizationId,
        source: { $ne: "bazantic-recipe" },
        status: "proposed",
      },
      { $set: { status: "authorizing" } },
      { new: true },
    );
    if (!action) {
      const existing = await this.actions.findOne({
        authorizationId: request.data.authorizationId,
      });
      if (!existing)
        throw new NotFoundException("Authorization request not found");
      throw new ConflictException(
        "This action version already has an authorization decision",
      );
    }

    try {
      const [task, agent] = await Promise.all([
        this.tasks.findById(action.taskId).exec(),
        this.agents.findById(action.agentId).exec(),
      ]);
      if (!task || !agent)
        throw new NotFoundException("Authorization context not found");
      const verdict = await this.orchestrator.authorize({
        taskId: task._id.toString(),
        agentName: agent.ensName,
        agentWallet: agent.wallet as `0x${string}`,
        capability: action.actionType as
          | "procurement.purchase"
          | "travel.booking",
        vendor: action.vendor,
        amountCents: action.amountCents,
      });
      action.ensAuthorized = verdict.stage === "policy";
      action.policyAuthorized = verdict.authorized;
      action.publicDenialCode = verdict.code;
      action.status = verdict.authorized ? "authorized" : "blocked";
      await action.save();
      return verdict;
    } catch (error) {
      action.status = "failed";
      action.publicDenialCode = "EXECUTION_FAILED";
      await action.save().catch(() => undefined);
      throw error;
    }
  }
}
