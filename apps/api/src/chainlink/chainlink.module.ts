import { Module } from "@nestjs/common";
import { ChainlinkCrePolicyProvider } from "./chainlink-cre-policy.provider.js";
import { LocalPolicyProvider } from "./local-policy.provider.js";
import { CONFIDENTIAL_POLICY_PROVIDER } from "./policy-provider.interface.js";
import { DatabaseModule } from "../database/database.module.js";
import { OrganizationPolicyProvider } from "./organization-policy.provider.js";

@Module({
  imports: [DatabaseModule],
  providers: [
    LocalPolicyProvider,
    ChainlinkCrePolicyProvider,
    OrganizationPolicyProvider,
    {
      provide: CONFIDENTIAL_POLICY_PROVIDER,
      useExisting: OrganizationPolicyProvider,
    },
  ],
  exports: [CONFIDENTIAL_POLICY_PROVIDER],
})
export class ChainlinkModule {}
