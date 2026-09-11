import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { EnsModule } from "../ens/ens.module.js";
import { IntegrationsController } from "./integrations.controller.js";
import { IntegrationsService } from "./integrations.service.js";

@Module({
  imports: [DatabaseModule, EnsModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService],
})
export class IntegrationsModule {}
