import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { EnsAgentIdentity } from "@latch/shared";
import { normalize } from "viem/ens";
import type { Address } from "viem";
import type { Environment } from "../config/environment.js";
import { markIntegrationSuccess } from "../common/integration-telemetry.js";
import { ENS_V2_CLIENT, latchTextKeys } from "./ens.constants.js";
import { EnsRecordParser } from "./ens-record.parser.js";
import type { EnsV2ReadClient } from "./ens.types.js";

@Injectable()
export class EnsService {
  private readonly universalResolverAddress: Address;

  constructor(
    @Inject(ENS_V2_CLIENT) private readonly client: EnsV2ReadClient,
    @Inject(ConfigService)
    private readonly config: ConfigService<Environment, true>,
    @Inject(EnsRecordParser) private readonly parser: EnsRecordParser,
  ) {
    this.universalResolverAddress = this.config.get(
      "ENSV2_UNIVERSAL_RESOLVER_ADDRESS",
      {
        infer: true,
      },
    );
  }

  async resolveAgent(unsafeName: string): Promise<EnsAgentIdentity> {
    const name = normalize(unsafeName.trim());
    const universalResolverAddress = this.universalResolverAddress;

    const [
      wallet,
      resolver,
      role,
      status,
      capabilities,
      organization,
      policyVersion,
      block,
    ] = await Promise.all([
      this.client.getEnsAddress({ name, universalResolverAddress }),
      this.readResolver(name),
      this.readText(name, latchTextKeys.role),
      this.readText(name, latchTextKeys.status),
      this.readText(name, latchTextKeys.capabilities),
      this.readText(name, latchTextKeys.organization),
      this.readText(name, latchTextKeys.policyVersion),
      this.client.getBlockNumber(),
    ]);

    const identity: EnsAgentIdentity = {
      name,
      wallet: wallet?.toLowerCase() as `0x${string}` | null,
      role: this.parser.parseRole(role),
      status: this.parser.parseStatus(status),
      capabilities: this.parser.parseCapabilities(capabilities),
      organization: this.parser.parseOrganization(organization),
      policyVersion: this.parser.parsePolicyVersion(policyVersion),
      resolver,
      checkedAtBlock: block,
    };
    if (identity.wallet || identity.resolver) markIntegrationSuccess("ensv2");
    return identity;
  }

  async verifyWallet(name: string, expectedWallet: Address): Promise<boolean> {
    const identity = await this.resolveAgent(name);
    return identity.wallet?.toLowerCase() === expectedWallet.toLowerCase();
  }

  async verifyCapability(name: string, capability: string): Promise<boolean> {
    const identity = await this.resolveAgent(name);
    return identity.capabilities.includes(
      capability as (typeof identity.capabilities)[number],
    );
  }

  private async readText(name: string, key: string): Promise<string | null> {
    try {
      return await this.client.getEnsText({
        key,
        name,
        universalResolverAddress: this.universalResolverAddress,
      });
    } catch {
      return null;
    }
  }

  private async readResolver(name: string): Promise<Address | null> {
    try {
      return await this.client.getEnsResolver({
        name,
        universalResolverAddress: this.universalResolverAddress,
      });
    } catch {
      return null;
    }
  }
}
