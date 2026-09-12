import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  CapabilitySchema,
  requiredRoleByCapability,
  type Capability,
  type DenialCode,
  type EnsAgentIdentity,
  type EnsAuthorizationResult,
} from "@latch/shared";
import type { Address } from "viem";
import { normalize } from "viem/ens";
import type { Environment } from "../config/environment.js";
import { EnsService } from "./ens.service.js";

export interface AuthorizeEnsInput {
  agentName: string;
  expectedWallet: Address;
  capability: Capability;
  expectedOrganization?: string;
}

@Injectable()
export class EnsAuthorizationService {
  constructor(
    @Inject(EnsService) private readonly ensService: EnsService,
    @Inject(ConfigService)
    private readonly config: ConfigService<Environment, true>,
  ) {}

  async authorize(input: AuthorizeEnsInput): Promise<EnsAuthorizationResult> {
    const capability = CapabilitySchema.parse(input.capability);
    const agentName = normalize(input.agentName.trim());
    let identity: EnsAgentIdentity;

    try {
      identity = await this.ensService.resolveAgent(agentName);
    } catch {
      return this.denied(agentName, capability, "ENS_NAME_UNRESOLVED");
    }

    if (!identity.wallet)
      return this.deniedFrom(identity, capability, "ENS_NAME_UNRESOLVED");
    if (identity.wallet.toLowerCase() !== input.expectedWallet.toLowerCase()) {
      return this.deniedFrom(identity, capability, "ENS_WALLET_MISMATCH");
    }
    const expectedOrganization = (
      input.expectedOrganization ??
      this.config.get("DEMO_ORG_ENS", { infer: true })
    )?.toLowerCase();
    if (
      !expectedOrganization ||
      identity.organization !== expectedOrganization
    ) {
      return this.deniedFrom(identity, capability, "ROLE_MISMATCH");
    }
    if (identity.status === "revoked")
      return this.deniedFrom(identity, capability, "AGENT_REVOKED");
    if (identity.status !== "active")
      return this.deniedFrom(identity, capability, "ENS_NAME_UNRESOLVED");
    if (identity.role !== requiredRoleByCapability[capability]) {
      return this.deniedFrom(identity, capability, "ROLE_MISMATCH");
    }
    if (!identity.capabilities.includes(capability)) {
      return this.deniedFrom(identity, capability, "CAPABILITY_MISSING");
    }
    if (!identity.policyVersion)
      return this.deniedFrom(identity, capability, "ENS_NAME_UNRESOLVED");

    return {
      authorized: true,
      agentName: identity.name,
      agentWallet: identity.wallet,
      role: identity.role,
      status: identity.status,
      capability,
      policyVersion: identity.policyVersion,
      checkedAtBlock: identity.checkedAtBlock,
    };
  }

  private denied(
    agentName: string,
    capability: Capability,
    denialCode: DenialCode,
  ): EnsAuthorizationResult {
    return {
      authorized: false,
      agentName,
      agentWallet: null,
      role: null,
      status: null,
      capability,
      policyVersion: null,
      denialCode,
    };
  }

  private deniedFrom(
    identity: EnsAgentIdentity,
    capability: Capability,
    denialCode: DenialCode,
  ): EnsAuthorizationResult {
    return {
      authorized: false,
      agentName: identity.name,
      agentWallet: identity.wallet,
      role: identity.role,
      status: identity.status,
      capability,
      policyVersion: identity.policyVersion,
      denialCode,
      checkedAtBlock: identity.checkedAtBlock,
    };
  }
}
