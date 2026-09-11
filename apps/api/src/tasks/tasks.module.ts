import { Module } from "@nestjs/common";
import { AuthorizationModule } from "../authorization/authorization.module.js";
import { AuditModule } from "../audit/audit.module.js";
import { CapabilitiesModule } from "../capabilities/capabilities.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { PlanningModule } from "../planning/planning.module.js";
import { TaskExecutionService } from "./task-execution.service.js";
import { TasksController } from "./tasks.controller.js";

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    PlanningModule,
    CapabilitiesModule,
    AuthorizationModule,
  ],
  controllers: [TasksController],
  providers: [TaskExecutionService],
})
export class TasksModule {}
