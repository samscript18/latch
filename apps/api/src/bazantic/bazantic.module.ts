import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module.js";
import { AuthorizationModule } from "../authorization/authorization.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { BazanticRecipeController } from "./bazantic-recipe.controller.js";
import { BazanticRecipeGuard } from "./bazantic-recipe.guard.js";
import { BazanticRecipeService } from "./bazantic-recipe.service.js";

@Module({
  imports: [DatabaseModule, AuditModule, AuthorizationModule],
  controllers: [BazanticRecipeController],
  providers: [BazanticRecipeGuard, BazanticRecipeService],
})
export class BazanticModule {}
