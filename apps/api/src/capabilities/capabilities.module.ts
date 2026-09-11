import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Environment } from "../config/environment.js";
import { CAPABILITY_PROVIDER } from "./capability-provider.interface.js";
import { LocalDemoCapabilityProvider } from "./local-demo-capability.provider.js";
import { RecipeOnlyCapabilityProvider } from "./recipe-only-capability.provider.js";

@Module({
  providers: [
    LocalDemoCapabilityProvider,
    RecipeOnlyCapabilityProvider,
    {
      provide: CAPABILITY_PROVIDER,
      inject: [
        ConfigService,
        LocalDemoCapabilityProvider,
        RecipeOnlyCapabilityProvider,
      ],
      useFactory: (
        config: ConfigService<Environment, true>,
        local: LocalDemoCapabilityProvider,
        recipe: RecipeOnlyCapabilityProvider,
      ) => {
        const provider = config.get("CAPABILITY_PROVIDER", { infer: true });
        return provider === "recipe" ? recipe : local;
      },
    },
  ],
  exports: [CAPABILITY_PROVIDER],
})
export class CapabilitiesModule {}
