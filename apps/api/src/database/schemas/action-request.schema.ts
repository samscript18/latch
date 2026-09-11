import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { denialCodes, type DenialCode } from "@latch/shared";
import type { HydratedDocument, Types } from "mongoose";

@Schema({ collection: "action_requests", timestamps: true })
export class ActionRequest {
  @Prop({ index: true, ref: "Task", required: true, type: "ObjectId" })
  taskId!: Types.ObjectId;

  @Prop({ index: true, ref: "Agent", required: true, type: "ObjectId" })
  agentId!: Types.ObjectId;

  @Prop({ required: true, type: String }) actionType!: string;
  @Prop({ min: 1, required: true, type: Number }) quantity!: number;
  @Prop({ required: true, type: String }) item!: string;
  @Prop({ required: true, type: String }) vendor!: string;
  @Prop({ min: 0, required: true, type: Number }) amountCents!: number;
  @Prop({ default: false, required: true, type: Boolean })
  ensAuthorized!: boolean;
  @Prop({ default: false, required: true, type: Boolean })
  policyAuthorized!: boolean;
  @Prop({ enum: denialCodes, type: String }) publicDenialCode?: DenialCode;
  @Prop({ type: String }) policyVersion?: string;
  @Prop({ type: String }) executionReference?: string;
  @Prop({ type: String }) transactionHash?: string;
  @Prop({
    enum: [
      "proposed",
      "authorizing",
      "authorized",
      "consumed",
      "blocked",
      "failed",
    ],
    index: true,
    type: String,
  })
  status!:
    | "proposed"
    | "authorizing"
    | "authorized"
    | "consumed"
    | "blocked"
    | "failed";
  @Prop({ required: true, type: String }) authorizationId!: string;
  @Prop({ default: false, required: true, type: Boolean }) consumed!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export type ActionRequestDocument = HydratedDocument<ActionRequest>;
export const ActionRequestSchema = SchemaFactory.createForClass(ActionRequest);
ActionRequestSchema.index({ taskId: 1, authorizationId: 1 }, { unique: true });
