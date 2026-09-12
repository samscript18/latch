import {
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AdminWalletGuard } from "../auth/admin-wallet.guard.js";
import { WalletAuthGuard } from "../auth/wallet-auth.guard.js";
import type { WalletAuthenticatedRequest } from "../auth/auth.types.js";
import { AgentsService } from "./agents.service.js";

@Controller("agents")
export class AgentsController {
  constructor(@Inject(AgentsService) private readonly agents: AgentsService) {}

  @Get()
  @UseGuards(WalletAuthGuard)
  list(@Req() request: WalletAuthenticatedRequest) {
    return this.agents.listForOwner(request.walletSession!.address);
  }

  @Get(":ensName")
  findOne(@Param("ensName") ensName: string) {
    return this.agents.findByEnsName(ensName);
  }

  @Post(":ensName/revoke")
  @UseGuards(AdminWalletGuard)
  revoke(
    @Param("ensName") ensName: string,
    @Req() request: WalletAuthenticatedRequest,
  ) {
    return this.agents.revoke(ensName, request.walletSession!.address);
  }
}
