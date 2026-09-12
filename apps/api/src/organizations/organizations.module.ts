import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { OrganizationsController } from "./organizations.controller.js";
import { OrganizationsService } from "./organizations.service.js";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
})
export class OrganizationsModule {}
