import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnvironment } from "../config/environment.js";
import { DatabaseModule } from "../database/database.module.js";
import { HealthModule } from "../health/health.module.js";
import { EnsModule } from "../ens/ens.module.js";
import { AuthorizationModule } from "../authorization/authorization.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { AgentsModule } from "../agents/agents.module.js";
import { TasksModule } from "../tasks/tasks.module.js";
import { IntegrationsModule } from "../integrations/integrations.module.js";
import { OrganizationsModule } from "../organizations/organizations.module.js";
import { ActivityModule } from "../activity/activity.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: validateEnvironment,
    }),
    DatabaseModule,
    HealthModule,
    EnsModule,
    AuthorizationModule,
    AuthModule,
    AgentsModule,
    TasksModule,
    OrganizationsModule,
    IntegrationsModule,
    ActivityModule,
  ],
})
export class AppModule {}
