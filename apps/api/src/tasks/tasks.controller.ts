import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { WalletAuthGuard } from "../auth/wallet-auth.guard.js";
import type { WalletAuthenticatedRequest } from "../auth/auth.types.js";
import { TaskExecutionService } from "./task-execution.service.js";

const createTaskSchema = z
  .object({
    agentEnsName: z.string().trim().min(3),
    prompt: z.string().trim().min(1).max(2_000),
  })
  .strict();
const taskIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/);

@Controller("tasks")
@UseGuards(WalletAuthGuard)
export class TasksController {
  constructor(
    @Inject(TaskExecutionService) private readonly tasks: TaskExecutionService,
  ) {}

  @Post()
  create(@Body() body: unknown, @Req() req: WalletAuthenticatedRequest) {
    const request = createTaskSchema.safeParse(body);
    if (!request.success) throw new BadRequestException("Invalid task request");
    return this.tasks.create(
      request.data.agentEnsName,
      request.data.prompt,
      req.walletSession!.address,
    );
  }

  @Get()
  list(@Req() req: WalletAuthenticatedRequest) {
    return this.tasks.list(req.walletSession!.address);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @Req() req: WalletAuthenticatedRequest) {
    return this.tasks.findOne(this.parseId(id), req.walletSession!.address);
  }

  @Post(":id/run")
  run(@Param("id") id: string, @Req() req: WalletAuthenticatedRequest) {
    return this.tasks.run(this.parseId(id), req.walletSession!.address);
  }

  @Get(":id/activity")
  activity(@Param("id") id: string, @Req() req: WalletAuthenticatedRequest) {
    return this.tasks.activity(this.parseId(id), req.walletSession!.address);
  }

  private parseId(id: string): string {
    const parsed = taskIdSchema.safeParse(id);
    if (!parsed.success) throw new BadRequestException("Invalid task ID");
    return parsed.data;
  }
}
