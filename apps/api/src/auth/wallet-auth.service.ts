import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import {
  getAddress,
  isAddress,
  verifyMessage,
  type Address,
  type Hex,
} from "viem";
import type { Environment } from "../config/environment.js";
import {
  AuthChallenge,
  type AuthChallengeDocument,
  AuthSession,
  type AuthSessionDocument,
} from "../database/schemas/auth.schema.js";
import type { AuthenticatedWallet } from "./auth.types.js";
import {
  buildSignInMessage,
  createOpaqueSecret,
  hashSessionToken,
} from "./auth.utils.js";

interface CreateChallengeResult {
  address: Address;
  nonce: string;
  message: string;
  expiresAt: string;
}

interface VerifyChallengeInput {
  address: string;
  nonce: string;
  signature: string;
}

@Injectable()
export class WalletAuthService {
  constructor(
    @InjectModel(AuthChallenge.name)
    private readonly challenges: Model<AuthChallengeDocument>,
    @InjectModel(AuthSession.name)
    private readonly sessions: Model<AuthSessionDocument>,
    @Inject(ConfigService)
    private readonly config: ConfigService<Environment, true>,
  ) {}

  async createChallenge(unsafeAddress: string): Promise<CreateChallengeResult> {
    const address = this.normalizeAddress(unsafeAddress);
    const issuedAt = new Date();
    const expiresAt = new Date(
      issuedAt.getTime() +
        this.config.get("AUTH_CHALLENGE_TTL_SECONDS", { infer: true }) * 1_000,
    );
    const nonce = createOpaqueSecret(18);
    const message = buildSignInMessage({
      address,
      nonce,
      issuedAt,
      expiresAt,
      chainId: this.config.get("SEPOLIA_CHAIN_ID", { infer: true }),
    });
    await this.challenges.create({
      address: address.toLowerCase(),
      expiresAt,
      message,
      nonce,
    });
    return { address, nonce, message, expiresAt: expiresAt.toISOString() };
  }

  async verifyChallenge(input: VerifyChallengeInput) {
    const address = this.normalizeAddress(input.address);
    if (!/^0x[a-fA-F0-9]{130}$/.test(input.signature)) {
      throw new UnauthorizedException("Invalid wallet signature");
    }
    const challenge = await this.challenges
      .findOne({
        address: address.toLowerCase(),
        nonce: input.nonce,
        usedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      })
      .exec();
    if (!challenge)
      throw new UnauthorizedException("Challenge is invalid or expired");

    const valid = await verifyMessage({
      address,
      message: challenge.message,
      signature: input.signature as Hex,
    });
    if (!valid) throw new UnauthorizedException("Invalid wallet signature");

    const consumed = await this.challenges.findOneAndUpdate(
      {
        _id: challenge._id,
        usedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      },
      { $set: { usedAt: new Date() } },
      { new: true },
    );
    if (!consumed)
      throw new UnauthorizedException("Challenge has already been used");

    const token = createOpaqueSecret();
    const expiresAt = new Date(
      Date.now() +
        this.config.get("AUTH_SESSION_TTL_SECONDS", { infer: true }) * 1_000,
    );
    await this.sessions.create({
      address: address.toLowerCase(),
      expiresAt,
      tokenHash: hashSessionToken(token),
    });
    return {
      token,
      tokenType: "Bearer" as const,
      address,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async authenticateToken(token: string): Promise<AuthenticatedWallet> {
    const session = await this.sessions
      .findOne({
        tokenHash: hashSessionToken(token),
        revokedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      })
      .lean()
      .exec();
    if (!session)
      throw new UnauthorizedException("Session is invalid or expired");
    return {
      address: getAddress(session.address),
      sessionExpiresAt: session.expiresAt,
    };
  }

  private normalizeAddress(address: string): Address {
    if (!isAddress(address, { strict: false }))
      throw new UnauthorizedException("Invalid wallet address");
    return getAddress(address);
  }
}
