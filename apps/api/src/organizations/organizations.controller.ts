import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AgentTypeSchema } from "@latch/shared";
import { z } from "zod";
import { WalletAuthGuard } from "../auth/wallet-auth.guard.js";
import type { WalletAuthenticatedRequest } from "../auth/auth.types.js";
import { OrganizationsService } from "./organizations.service.js";

const onboardingSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    ensName: z.string().trim().min(3).max(255),
    industry: z.string().trim().max(100).optional(),
    website: z.union([z.literal(""), z.string().url().max(300)]).optional(),
    agents: z
      .array(
        z
          .object({
            ensName: z.string().trim().min(3).max(255),
            wallet: z.string(),
            type: AgentTypeSchema,
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict();

const policySchema = z.discriminatedUnion("provider", [
  z.object({ provider: z.literal("chainlink") }).strict(),
  z
    .object({
      provider: z.literal("manual"),
      procurement: z
        .object({
          policyVersion: z.string().trim().min(1).max(128),
          maxAutonomousSpendCents: z.number().int().nonnegative(),
          allowedVendors: z.array(z.string().trim().min(1).max(128)).max(100),
        })
        .strict(),
      research: z
        .object({
          policyVersion: z.string().trim().min(1).max(128),
          allowedDomains: z.array(z.string().trim().min(1).max(253)).max(100),
          blockedDomains: z.array(z.string().trim().min(1).max(253)).max(100),
          maxResults: z.number().int().min(1).max(20),
        })
        .strict(),
    })
    .strict(),
]);

const profileSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    industry: z.string().trim().max(100),
    website: z.union([z.literal(""), z.string().url().max(300)]),
  })
  .strict();

@Controller("organization")
export class OrganizationsController {
  constructor(
    @Inject(OrganizationsService)
    private readonly organizations: OrganizationsService,
  ) {}

  @Get("me")
  @UseGuards(WalletAuthGuard)
  getMine(@Req() request: WalletAuthenticatedRequest) {
    return this.organizations.getByOwner(request.walletSession!.address);
  }

  @Put("me")
  @UseGuards(WalletAuthGuard)
  update(@Req() request: WalletAuthenticatedRequest, @Body() body: unknown) {
    const parsed = this.parseOnboarding(body);
    return this.organizations.updateForOwner(
      request.walletSession!.address,
      parsed,
    );
  }

  @Post("me")
  @UseGuards(WalletAuthGuard)
  create(@Req() request: WalletAuthenticatedRequest, @Body() body: unknown) {
    const parsed = this.parseOnboarding(body);
    return this.organizations.createForOwner(
      request.walletSession!.address,
      parsed,
    );
  }

  @Put("me/policy")
  @UseGuards(WalletAuthGuard)
  updatePolicy(
    @Req() request: WalletAuthenticatedRequest,
    @Body() body: unknown,
  ) {
    const parsed = policySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid organization policy configuration");
    }
    return this.organizations.updatePolicy(
      request.walletSession!.address,
      parsed.data,
    );
  }

  @Put("me/profile")
  @UseGuards(WalletAuthGuard)
  updateProfile(
    @Req() request: WalletAuthenticatedRequest,
    @Body() body: unknown,
  ) {
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid organization profile");
    }
    return this.organizations.updateProfile(
      request.walletSession!.address,
      parsed.data,
    );
  }

  private parseOnboarding(body: unknown) {
    const parsed = onboardingSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: "Invalid organization onboarding details",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
    return parsed.data;
  }
}
