import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, timingSafeEqual } from "node:crypto";
import type { Environment } from "../config/environment.js";

@Injectable()
export class BazanticRecipeGuard implements CanActivate {
  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService<Environment, true>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const configured = this.config.get("BAZANTIC_API_KEY", { infer: true });
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
    }>();
    const supplied = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!configured || !supplied || !this.equal(configured, supplied)) {
      throw new UnauthorizedException("Invalid Bazantic Recipe credential");
    }
    return true;
  }

  private equal(left: string, right: string): boolean {
    const leftHash = createHash("sha256").update(left).digest();
    const rightHash = createHash("sha256").update(right).digest();
    return timingSafeEqual(leftHash, rightHash);
  }
}
