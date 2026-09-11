import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { getAddress } from "viem";
import type { Environment } from "../config/environment.js";
import type { WalletAuthenticatedRequest } from "./auth.types.js";
import { WalletAuthGuard } from "./wallet-auth.guard.js";

@Injectable()
export class AdminWalletGuard implements CanActivate {
  constructor(
    @Inject(WalletAuthGuard) private readonly walletGuard: WalletAuthGuard,
    @Inject(ConfigService)
    private readonly config: ConfigService<Environment, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this.walletGuard.canActivate(context);
    const request = context
      .switchToHttp()
      .getRequest<WalletAuthenticatedRequest>();
    const configuredAdmin = this.config.get("ADMIN_WALLET_ADDRESS", {
      infer: true,
    });
    if (!configuredAdmin || !request.walletSession) {
      throw new UnauthorizedException(
        "Organization admin wallet is not configured",
      );
    }
    if (getAddress(configuredAdmin) !== request.walletSession.address) {
      throw new UnauthorizedException("Organization admin wallet required");
    }
    return true;
  }
}
