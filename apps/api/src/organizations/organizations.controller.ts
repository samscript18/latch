import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
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
            displayName: z.string().trim().min(2).max(100),
            ensName: z.string().trim().min(3).max(255),
            wallet: z.string(),
            role: z.enum(["procurement", "travel"]),
            capability: z.enum(["procurement.purchase", "travel.booking"]),
            policyVersion: z.string().trim().min(1).max(128),
          })
          .strict(),
      )
      .min(1)
      .max(20),
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
  onboard(@Req() request: WalletAuthenticatedRequest, @Body() body: unknown) {
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
    return this.organizations.upsertForOwner(
      request.walletSession!.address,
      parsed.data,
    );
  }
}
