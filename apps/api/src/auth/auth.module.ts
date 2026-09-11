import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { AdminWalletGuard } from "./admin-wallet.guard.js";
import { AuthController } from "./auth.controller.js";
import { WalletAuthGuard } from "./wallet-auth.guard.js";
import { WalletAuthService } from "./wallet-auth.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [WalletAuthService, WalletAuthGuard, AdminWalletGuard],
  exports: [WalletAuthService, WalletAuthGuard, AdminWalletGuard],
})
export class AuthModule {}
