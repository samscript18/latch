import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createPublicClient, http } from "viem";
import type { Environment } from "../config/environment.js";
import { EnsAuthorizationService } from "./ens-authorization.service.js";
import {
  createEnsV2HackathonChain,
  ENS_V2_CLIENT,
} from "./ens.constants.js";
import { EnsController } from "./ens.controller.js";
import { EnsRecordParser } from "./ens-record.parser.js";
import { EnsService } from "./ens.service.js";
import { EnsAdminService } from "./ens-admin.service.js";
import { EnsTransactionGateway } from "./ens-transaction.gateway.js";

@Module({
  controllers: [EnsController],
  providers: [
    EnsRecordParser,
    EnsService,
    EnsAuthorizationService,
    EnsTransactionGateway,
    EnsAdminService,
    {
      provide: ENS_V2_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) => {
        const universalResolverAddress = config.get(
          "ENSV2_UNIVERSAL_RESOLVER_ADDRESS",
          { infer: true },
        );
        return createPublicClient({
          chain: createEnsV2HackathonChain(universalResolverAddress),
          transport: http(config.get("SEPOLIA_RPC_URL", { infer: true })),
        });
      },
    },
  ],
  exports: [EnsService, EnsAuthorizationService, EnsAdminService],
})
export class EnsModule {}
