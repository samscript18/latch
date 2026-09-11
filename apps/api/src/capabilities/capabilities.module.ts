import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Environment } from "../config/environment.js";
import { BazanticCapabilityProvider } from "./bazantic-capability.provider.js";
import { CAPABILITY_PROVIDER } from "./capability-provider.interface.js";
import { LocalDemoCapabilityProvider } from "./local-demo-capability.provider.js";

@Module({
  providers: [
    LocalDemoCapabilityProvider,
    {
      provide: CAPABILITY_PROVIDER,
      inject: [ConfigService, LocalDemoCapabilityProvider],
      useFactory: (
        config: ConfigService<Environment, true>,
        local: LocalDemoCapabilityProvider,
      ) =>
        config.get("CAPABILITY_PROVIDER", { infer: true }) === "bazantic"
          ? new BazanticCapabilityProvider(config)
          : local,
    },
  ],
  exports: [CAPABILITY_PROVIDER],
})
export class CapabilitiesModule {}
