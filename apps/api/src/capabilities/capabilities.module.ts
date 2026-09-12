import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Environment } from "../config/environment.js";
import { CAPABILITY_PROVIDER } from "./capability-provider.interface.js";
import { LocalDemoCapabilityProvider } from "./local-demo-capability.provider.js";
import { BazanticCapabilityProvider } from "./bazantic-capability.provider.js";
import { TavilyResearchProvider } from "./tavily-research.provider.js";

@Module({
  providers: [
    LocalDemoCapabilityProvider,
    BazanticCapabilityProvider,
    TavilyResearchProvider,
    {
      provide: CAPABILITY_PROVIDER,
      inject: [
        ConfigService,
        LocalDemoCapabilityProvider,
        BazanticCapabilityProvider,
      ],
      useFactory: (
        config: ConfigService<Environment, true>,
        local: LocalDemoCapabilityProvider,
        bazantic: BazanticCapabilityProvider,
      ) => {
        const provider = config.get("TRY_NOW_CAPABILITY_PROVIDER", { infer: true });
        return provider === "bazantic" ? bazantic : local;
      },
    },
  ],
  exports: [CAPABILITY_PROVIDER, TavilyResearchProvider],
})
export class CapabilitiesModule {}
