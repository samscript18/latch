import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { denialCodes, type DenialCode } from "@latch/shared";
import type { HydratedDocument, Types } from "mongoose";

@Schema({ _id: false })
export class ResearchResult {
  @Prop({ required: true, trim: true, type: String }) title!: string;
  @Prop({ required: true, trim: true, type: String }) url!: string;
  @Prop({ required: true, type: String }) content!: string;
  @Prop({ min: 0, max: 1, type: Number }) score?: number;
}

const ResearchResultSchema = SchemaFactory.createForClass(ResearchResult);

@Schema({ collection: "research_proposals", timestamps: true })
export class ResearchProposal {
  @Prop({ index: true, ref: "Task", required: true, type: "ObjectId" })
  taskId!: Types.ObjectId;

  @Prop({ index: true, ref: "Agent", required: true, type: "ObjectId" })
  agentId!: Types.ObjectId;

  @Prop({ enum: ["research.search"], required: true, type: String })
  actionType!: "research.search";

  @Prop({ required: true, trim: true, type: String }) query!: string;
  @Prop({ default: [], type: [String] }) domains!: string[];
  @Prop({ min: 1, max: 20, required: true, type: Number }) maxResults!: number;
  @Prop({ default: false, required: true, type: Boolean }) ensAuthorized!: boolean;
  @Prop({ default: false, required: true, type: Boolean }) policyAuthorized!: boolean;
  @Prop({ enum: denialCodes, type: String }) publicDenialCode?: DenialCode;
  @Prop({ type: String }) policyVersion?: string;
  @Prop({ type: String }) executionReference?: string;
  @Prop({ default: [], type: [ResearchResultSchema] }) results!: ResearchResult[];
  @Prop({ index: true, required: true, type: String }) proposalDigest!: string;
  @Prop({ required: true, type: String, unique: true }) authorizationId!: string;
  @Prop({ default: false, required: true, type: Boolean }) consumed!: boolean;
  @Prop({
    enum: ["proposed", "authorizing", "authorized", "executing", "consumed", "blocked", "failed"],
    index: true,
    required: true,
    type: String,
  })
  status!: "proposed" | "authorizing" | "authorized" | "executing" | "consumed" | "blocked" | "failed";

  createdAt!: Date;
  updatedAt!: Date;
}

export type ResearchProposalDocument = HydratedDocument<ResearchProposal>;
export const ResearchProposalSchema = SchemaFactory.createForClass(ResearchProposal);
ResearchProposalSchema.index({ taskId: 1, authorizationId: 1 }, { unique: true });
