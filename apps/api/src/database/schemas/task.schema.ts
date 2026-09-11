import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import {
  capabilities,
  taskStatuses,
  type Capability,
  type TaskStatus,
} from "@latch/shared";
import type { HydratedDocument, Types } from "mongoose";

@Schema({ collection: "tasks", timestamps: true })
export class Task {
  @Prop({ index: true, ref: "Organization", required: true, type: "ObjectId" })
  organizationId!: Types.ObjectId;

  @Prop({ index: true, ref: "Agent", required: true, type: "ObjectId" })
  agentId!: Types.ObjectId;

  @Prop({ maxlength: 2_000, required: true, trim: true })
  prompt!: string;

  @Prop({
    default: "created",
    enum: taskStatuses,
    index: true,
    required: true,
    type: String,
  })
  status!: TaskStatus;

  @Prop({ enum: capabilities, type: String })
  requestedCapability?: Capability;

  @Prop({ default: 1, min: 1, required: true })
  actionVersion!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export type TaskDocument = HydratedDocument<Task>;
export const TaskSchema = SchemaFactory.createForClass(Task);
TaskSchema.index({ organizationId: 1, createdAt: -1 });
