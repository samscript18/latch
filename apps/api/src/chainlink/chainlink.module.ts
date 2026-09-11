import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Environment } from "../config/environment.js";
import { ChainlinkCrePolicyProvider } from "./chainlink-cre-policy.provider.js";
import { LocalPolicyProvider } from "./local-policy.provider.js";
import { CONFIDENTIAL_POLICY_PROVIDER } from "./policy-provider.interface.js";

@Module({
  providers: [
    LocalPolicyProvider,
    ChainlinkCrePolicyProvider,
    {
      provide: CONFIDENTIAL_POLICY_PROVIDER,
      inject: [ConfigService, LocalPolicyProvider, ChainlinkCrePolicyProvider],
      useFactory: (
        config: ConfigService<Environment, true>,
        local: LocalPolicyProvider,
        chainlink: ChainlinkCrePolicyProvider,
      ) =>
        config.get("POLICY_PROVIDER", { infer: true }) === "chainlink"
          ? chainlink
          : local,
    },
  ],
  exports: [CONFIDENTIAL_POLICY_PROVIDER],
})
export class ChainlinkModule {}
