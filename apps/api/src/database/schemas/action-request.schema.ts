import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { denialCodes, type DenialCode } from "@latch/shared";
import type { HydratedDocument, Types } from "mongoose";

@Schema({ collection: "action_requests", timestamps: true })
export class ActionRequest {
  @Prop({ index: true, ref: "Task", required: true, type: "ObjectId" })
  taskId!: Types.ObjectId;

  @Prop({ index: true, ref: "Agent", required: true, type: "ObjectId" })
  agentId!: Types.ObjectId;

  @Prop({ required: true }) actionType!: string;
  @Prop({ min: 1, required: true }) quantity!: number;
  @Prop({ required: true }) item!: string;
  @Prop({ required: true }) vendor!: string;
  @Prop({ min: 0, required: true }) amountCents!: number;
  @Prop({ default: false, required: true }) ensAuthorized!: boolean;
  @Prop({ default: false, required: true }) policyAuthorized!: boolean;
  @Prop({ enum: denialCodes, type: String }) publicDenialCode?: DenialCode;
  @Prop() policyVersion?: string;
  @Prop() executionReference?: string;
  @Prop() transactionHash?: string;
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
  @Prop({ required: true }) authorizationId!: string;
  @Prop({ default: false, required: true }) consumed!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export type ActionRequestDocument = HydratedDocument<ActionRequest>;
export const ActionRequestSchema = SchemaFactory.createForClass(ActionRequest);
ActionRequestSchema.index({ taskId: 1, authorizationId: 1 }, { unique: true });
