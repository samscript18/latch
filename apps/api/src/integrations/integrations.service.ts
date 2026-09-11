import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectConnection } from "@nestjs/mongoose";
import type { Connection } from "mongoose";
import type { Environment } from "../config/environment.js";
import {
  lastIntegrationSuccess,
  markIntegrationSuccess,
} from "../common/integration-telemetry.js";
import { EnsService } from "../ens/ens.service.js";

@Injectable()
export class IntegrationsService {
  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService<Environment, true>,
    @InjectConnection() private readonly database: Connection,
    @Inject(EnsService) private readonly ens: EnsService,
  ) {}

  async status() {
    const policyProvider = this.config.get("POLICY_PROVIDER", { infer: true });
    const capabilityProvider = this.config.get("CAPABILITY_PROVIDER", {
      infer: true,
    });
    const plannerProvider = this.config.get("PLANNER_PROVIDER", {
      infer: true,
    });
    const ensv2 = await this.checkEns();
    const bazanticUrl = this.config.get("BAZANTIC_GATEWAY_URL", {
      infer: true,
    });
    const recipeId = this.config.get("BAZANTIC_RECIPE_ID", { infer: true });
    const bazanticApiKey = this.config.get("BAZANTIC_API_KEY", { infer: true });
    const auditContract = this.config.get("AUDIT_CONTRACT_ADDRESS", {
      infer: true,
    });

    return {
      ensv2,
      confidentialPolicy: {
        provider: policyProvider,
        state:
          policyProvider === "chainlink" &&
          this.config.get("CRE_WORKFLOW_URL", { infer: true })
            ? "configured"
            : policyProvider === "chainlink"
              ? "missing_configuration"
              : "local_development",
        validForHackathon:
          policyProvider === "chainlink" &&
          Boolean(this.config.get("CRE_WORKFLOW_URL", { infer: true })),
        environment:
          this.config.get("CRE_ENVIRONMENT", { infer: true }) ?? null,
        lastSuccessfulSimulation: lastIntegrationSuccess("chainlink"),
      },
      capability: {
        provider: capabilityProvider,
        state:
          capabilityProvider === "bazantic" &&
          bazanticUrl &&
          recipeId &&
          bazanticApiKey
            ? "configured"
            : capabilityProvider === "bazantic"
              ? "missing_configuration"
              : "local_development",
        validForHackathon:
          capabilityProvider === "bazantic" &&
          Boolean(bazanticUrl && recipeId && bazanticApiKey),
        gateway: bazanticUrl ?? null,
        recipeId: recipeId ?? null,
        lastSuccessfulInvocation: lastIntegrationSuccess("bazantic"),
      },
      planner: {
        provider: plannerProvider,
        state:
          plannerProvider === "gemini" ? "configured" : "local_development",
        validForHackathon: plannerProvider === "gemini",
      },
      database: {
        provider: "mongodb",
        state: this.database.readyState === 1 ? "connected" : "disconnected",
      },
      auditContract: {
        network: "sepolia",
        state: auditContract ? "configured" : "not_deployed",
        address: auditContract ?? null,
      },
    };
  }

  private async checkEns() {
    const name =
      this.config.get("DEMO_PROCUREMENT_AGENT_ENS", { infer: true }) ??
      this.config.get("DEMO_ORG_ENS", { infer: true });
    if (!name || !this.config.get("SEPOLIA_RPC_URL", { infer: true })) {
      return {
        provider: "ensv2",
        network: "sepolia",
        state: "missing_configuration",
        checkedName: name ?? null,
        lastSuccessfulResolution: null,
      };
    }
    try {
      const identity = await this.ens.resolveAgent(name);
      const resolved = Boolean(identity.wallet || identity.resolver);
      return {
        provider: "ensv2",
        network: "sepolia",
        state: resolved ? "connected" : "resolution_failed",
        checkedName: name,
        lastSuccessfulResolution: resolved
          ? markIntegrationSuccess("ensv2")
          : lastIntegrationSuccess("ensv2"),
      };
    } catch {
      return {
        provider: "ensv2",
        network: "sepolia",
        state: "resolution_failed",
        checkedName: name,
        lastSuccessfulResolution: lastIntegrationSuccess("ensv2"),
      };
    }
  }
}
