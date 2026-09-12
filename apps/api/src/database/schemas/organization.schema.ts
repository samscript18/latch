import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

@Schema({ _id: false })
export class ManualProcurementPolicy {
  @Prop({ min: 0, required: true, type: Number })
  maxAutonomousSpendCents!: number;
  @Prop({ default: [], type: [String] }) allowedVendors!: string[];
  @Prop({ default: "procurement-v1", required: true, type: String })
  policyVersion!: string;
}

const ManualProcurementPolicySchema = SchemaFactory.createForClass(
  ManualProcurementPolicy,
);

@Schema({ _id: false })
export class ManualResearchPolicy {
  @Prop({ default: [], type: [String] }) allowedDomains!: string[];
  @Prop({ default: [], type: [String] }) blockedDomains!: string[];
  @Prop({ min: 1, max: 20, required: true, type: Number }) maxResults!: number;
  @Prop({ default: "research-v1", required: true, type: String })
  policyVersion!: string;
}

const ManualResearchPolicySchema = SchemaFactory.createForClass(
  ManualResearchPolicy,
);

@Schema({ collection: "organizations", timestamps: true })
export class Organization {
  @Prop({ required: true, trim: true, type: String })
  name!: string;

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
  ownerWallet!: string;

  @Prop({ trim: true, type: String })
  website?: string;

  @Prop({ trim: true, type: String })
  industry?: string;

  @Prop({ default: "complete", enum: ["incomplete", "complete"], type: String })
  onboardingStatus!: "incomplete" | "complete";

  @Prop({ default: "manual", enum: ["manual", "chainlink"], type: String })
  policyProvider!: "manual" | "chainlink";

  @Prop({ type: ManualProcurementPolicySchema })
  manualProcurementPolicy?: ManualProcurementPolicy;

  @Prop({ type: ManualResearchPolicySchema })
  manualResearchPolicy?: ManualResearchPolicy;

  createdAt!: Date;
  updatedAt!: Date;
}

export type OrganizationDocument = HydratedDocument<Organization>;
export const OrganizationSchema = SchemaFactory.createForClass(Organization);
OrganizationSchema.index({ ownerWallet: 1 }, { unique: true });
