import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument, Types } from "mongoose";

@Schema({ _id: false })
export class EnsSnapshot {
  @Prop({ type: String }) role?: string;
  @Prop({ type: String }) status?: string;
  @Prop({ type: [String], default: [] }) capabilities?: string[];
  @Prop({ type: String }) organization?: string;
  @Prop({ type: String }) policyVersion?: string;
  @Prop({ type: String }) resolver?: string;
}

const EnsSnapshotSchema = SchemaFactory.createForClass(EnsSnapshot);

@Schema({ collection: "agents", timestamps: true })
export class Agent {
  @Prop({ required: true, trim: true, type: String })
  displayName!: string;

  @Prop({
    index: true,
    lowercase: true,
    required: true,
    trim: true,
    type: String,
    unique: true,
  })
  ensName!: string;

  @Prop({ lowercase: true, required: true, trim: true, type: String })
  wallet!: string;

  @Prop({ index: true, ref: "Organization", required: true, type: "ObjectId" })
  organizationId!: Types.ObjectId;

  @Prop({ type: EnsSnapshotSchema })
  lastEnsSnapshot?: EnsSnapshot;

  @Prop({ type: String }) lastEnsBlock?: string;
  @Prop({ type: Date }) lastEnsCheckedAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export type AgentDocument = HydratedDocument<Agent>;
export const AgentSchema = SchemaFactory.createForClass(Agent);
