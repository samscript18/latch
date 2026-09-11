import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument, Types } from "mongoose";

@Schema({ collection: "activities", timestamps: true })
export class Activity {
  @Prop({ index: true, ref: "Organization", required: true, type: "ObjectId" })
  organizationId!: Types.ObjectId;
  @Prop({ index: true, ref: "Agent", required: true, type: "ObjectId" })
  agentId!: Types.ObjectId;
  @Prop({ index: true, ref: "Task", type: "ObjectId" })
  taskId?: Types.ObjectId;
  @Prop({ ref: "ActionRequest", type: "ObjectId" })
  actionRequestId?: Types.ObjectId;
  @Prop({ index: true, required: true, type: String }) type!: string;
  @Prop({
    enum: ["started", "authorized", "blocked", "failed", "succeeded"],
    required: true,
    type: String,
  })
  result!: string;
  @Prop({ maxlength: 500, required: true, type: String }) message!: string;
  @Prop({ default: {}, type: Object }) publicMetadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;
}

export type ActivityDocument = HydratedDocument<Activity>;
export const ActivitySchema = SchemaFactory.createForClass(Activity);
ActivitySchema.index({ taskId: 1, createdAt: 1 });
