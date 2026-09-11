import { Module } from "@nestjs/common";
import { ChainlinkModule } from "../chainlink/chainlink.module.js";
import { PublicActivityService } from "../common/public-activity.service.js";
import { DatabaseModule } from "../database/database.module.js";
import { EnsModule } from "../ens/ens.module.js";
import { AuthorizationController } from "./authorization.controller.js";
import { AuthorizationOrchestrator } from "./authorization.orchestrator.js";

@Module({
  imports: [DatabaseModule, EnsModule, ChainlinkModule],
  controllers: [AuthorizationController],
  providers: [AuthorizationOrchestrator, PublicActivityService],
  exports: [AuthorizationOrchestrator],
})
export class AuthorizationModule {}
