import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Environment } from "../config/environment.js";
import { GeminiTaskPlanner } from "./gemini-task-planner.js";
import { LocalTaskPlanner } from "./local-task-planner.js";
import { TASK_PLANNER } from "./task-planner.interface.js";

@Module({
  providers: [
    LocalTaskPlanner,
    {
      provide: TASK_PLANNER,
      inject: [ConfigService, LocalTaskPlanner],
      useFactory: (
        config: ConfigService<Environment, true>,
        local: LocalTaskPlanner,
      ) =>
        config.get("PLANNER_PROVIDER", { infer: true }) === "gemini"
          ? new GeminiTaskPlanner(config)
          : local,
    },
  ],
  exports: [TASK_PLANNER],
})
export class PlanningModule {}
