import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

@Schema({ collection: "organizations", timestamps: true })
export class Organization {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({
    index: true,
    lowercase: true,
    required: true,
    trim: true,
    unique: true,
  })
  ensName!: string;

  @Prop({ lowercase: true, required: true, trim: true })
  ownerWallet!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export type OrganizationDocument = HydratedDocument<Organization>;
export const OrganizationSchema = SchemaFactory.createForClass(Organization);
