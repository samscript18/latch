import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Post,
} from "@nestjs/common";
import { z } from "zod";
import { WalletAuthService } from "./wallet-auth.service.js";

const nonceRequest = z.object({ address: z.string() }).strict();
const verifyRequest = z
  .object({
    address: z.string(),
    nonce: z.string().min(16).max(128),
    signature: z.string(),
  })
  .strict();

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(WalletAuthService) private readonly auth: WalletAuthService,
  ) {}

  @Post("nonce")
  createNonce(@Body() body: unknown) {
    const parsed = nonceRequest.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException("A valid wallet address is required");
    return this.auth.createChallenge(parsed.data.address);
  }

  @Post("verify")
  verify(@Body() body: unknown) {
    const parsed = verifyRequest.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException("Invalid signature verification request");
    return this.auth.verifyChallenge(parsed.data);
  }
}
