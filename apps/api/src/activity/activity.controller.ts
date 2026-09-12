import { Controller, Get, Inject, Req, UseGuards } from "@nestjs/common";
import { WalletAuthGuard } from "../auth/wallet-auth.guard.js";
import type { WalletAuthenticatedRequest } from "../auth/auth.types.js";
import { ActivityService } from "./activity.service.js";

@Controller("activity")
export class ActivityController {
  constructor(
    @Inject(ActivityService) private readonly activity: ActivityService,
  ) {}

  @Get()
  @UseGuards(WalletAuthGuard)
  list(@Req() request: WalletAuthenticatedRequest) {
    return this.activity.list(request.walletSession!.address);
  }
}
