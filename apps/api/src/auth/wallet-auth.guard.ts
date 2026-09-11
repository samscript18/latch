import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { WalletAuthService } from "./wallet-auth.service.js";
import type { WalletAuthenticatedRequest } from "./auth.types.js";
import { readBearerToken } from "./auth.utils.js";

@Injectable()
export class WalletAuthGuard implements CanActivate {
  constructor(
    @Inject(WalletAuthService) private readonly auth: WalletAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<WalletAuthenticatedRequest>();
    const token = readBearerToken(request.headers.authorization);
    if (!token)
      throw new UnauthorizedException("A Bearer wallet session is required");
    request.walletSession = await this.auth.authenticateToken(token);
    return true;
  }
}
