import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { ActivityController } from "./activity.controller.js";
import { ActivityService } from "./activity.service.js";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ActivityController],
  providers: [ActivityService],
})
export class ActivityModule {}
