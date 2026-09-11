import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

@Schema({ collection: "auth_challenges", timestamps: true })
export class AuthChallenge {
  @Prop({ index: true, lowercase: true, required: true, type: String })
  address!: string;
  @Prop({ required: true, type: String, unique: true }) nonce!: string;
  @Prop({ required: true, type: String }) message!: string;
  @Prop({ expires: 0, index: true, required: true, type: Date })
  expiresAt!: Date;
  @Prop({ type: Date }) usedAt?: Date;
}

export type AuthChallengeDocument = HydratedDocument<AuthChallenge>;
export const AuthChallengeSchema = SchemaFactory.createForClass(AuthChallenge);

@Schema({ collection: "auth_sessions", timestamps: true })
export class AuthSession {
  @Prop({ index: true, lowercase: true, required: true, type: String })
  address!: string;
  @Prop({ required: true, type: String, unique: true }) tokenHash!: string;
  @Prop({ expires: 0, index: true, required: true, type: Date })
  expiresAt!: Date;
  @Prop({ type: Date }) revokedAt?: Date;
}

export type AuthSessionDocument = HydratedDocument<AuthSession>;
export const AuthSessionSchema = SchemaFactory.createForClass(AuthSession);
