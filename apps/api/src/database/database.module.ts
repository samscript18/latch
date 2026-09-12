import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import type { Environment } from "../config/environment.js";
import {
  ActionRequest,
  ActionRequestSchema,
} from "./schemas/action-request.schema.js";
import { Activity, ActivitySchema } from "./schemas/activity.schema.js";
import { Agent, AgentSchema } from "./schemas/agent.schema.js";
import {
  AuthChallenge,
  AuthChallengeSchema,
  AuthSession,
  AuthSessionSchema,
} from "./schemas/auth.schema.js";
import {
  Organization,
  OrganizationSchema,
} from "./schemas/organization.schema.js";
import { Task, TaskSchema } from "./schemas/task.schema.js";
import {
  ResearchProposal,
  ResearchProposalSchema,
} from "./schemas/research-proposal.schema.js";

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) => ({
        uri: config.get("MONGODB_URI", { infer: true }),
        serverSelectionTimeoutMS: 5_000,
        maxPoolSize: 10,
      }),
    }),
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: Agent.name, schema: AgentSchema },
      { name: Task.name, schema: TaskSchema },
      { name: ActionRequest.name, schema: ActionRequestSchema },
      { name: ResearchProposal.name, schema: ResearchProposalSchema },
      { name: Activity.name, schema: ActivitySchema },
      { name: AuthChallenge.name, schema: AuthChallengeSchema },
      { name: AuthSession.name, schema: AuthSessionSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
