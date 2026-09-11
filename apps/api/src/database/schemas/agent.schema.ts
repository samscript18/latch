import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument, Types } from "mongoose";

@Schema({ _id: false })
export class EnsSnapshot {
  @Prop() role?: string;
  @Prop() status?: string;
  @Prop({ type: [String], default: [] }) capabilities?: string[];
  @Prop() organization?: string;
  @Prop() policyVersion?: string;
  @Prop() resolver?: string;
}

const EnsSnapshotSchema = SchemaFactory.createForClass(EnsSnapshot);

@Schema({ collection: "agents", timestamps: true })
export class Agent {
  @Prop({ required: true, trim: true })
  displayName!: string;

  @Prop({
    index: true,
    lowercase: true,
    required: true,
    trim: true,
    unique: true,
  })
  ensName!: string;

  @Prop({ lowercase: true, required: true, trim: true })
  wallet!: string;

  @Prop({ index: true, ref: "Organization", required: true, type: "ObjectId" })
  organizationId!: Types.ObjectId;

  @Prop({ type: EnsSnapshotSchema })
  lastEnsSnapshot?: EnsSnapshot;

  @Prop() lastEnsBlock?: string;
  @Prop() lastEnsCheckedAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export type AgentDocument = HydratedDocument<Agent>;
export const AgentSchema = SchemaFactory.createForClass(Agent);
