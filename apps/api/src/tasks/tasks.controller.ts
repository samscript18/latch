import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
} from "@nestjs/common";
import { z } from "zod";
import { TaskExecutionService } from "./task-execution.service.js";

const createTaskSchema = z
  .object({
    agentEnsName: z.string().trim().min(3),
    prompt: z.string().trim().min(1).max(2_000),
  })
  .strict();
const taskIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/);

@Controller("tasks")
export class TasksController {
  constructor(
    @Inject(TaskExecutionService) private readonly tasks: TaskExecutionService,
  ) {}

  @Post()
  create(@Body() body: unknown) {
    const request = createTaskSchema.safeParse(body);
    if (!request.success) throw new BadRequestException("Invalid task request");
    return this.tasks.create(request.data.agentEnsName, request.data.prompt);
  }

  @Get()
  list() {
    return this.tasks.list();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.tasks.findOne(this.parseId(id));
  }

  @Post(":id/run")
  run(@Param("id") id: string) {
    return this.tasks.run(this.parseId(id));
  }

  @Get(":id/activity")
  activity(@Param("id") id: string) {
    return this.tasks.activity(this.parseId(id));
  }

  private parseId(id: string): string {
    const parsed = taskIdSchema.safeParse(id);
    if (!parsed.success) throw new BadRequestException("Invalid task ID");
    return parsed.data;
  }
}
