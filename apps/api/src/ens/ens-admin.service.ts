import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type {
  AgentRole,
  AgentStatus,
  Capability,
  EnsAgentIdentity,
} from "@latch/shared";
import {
  encodeFunctionData,
  getAddress,
  keccak256,
  stringToHex,
  toHex,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { normalize, packetToBytes } from "viem/ens";
import {
  ROLE_SET_ADDR,
  ROLE_SET_TEXT,
  ROLE_SET_TEXT_ADMIN,
  SAFE_AGENT_TEXT_KEY,
  latchTextKeys,
} from "./ens.constants.js";
import { EnsService } from "./ens.service.js";
import { EnsTransactionGateway } from "./ens-transaction.gateway.js";
import { permissionedResolverAbi } from "./permissioned-resolver.abi.js";

const protectedKeys = new Set<string>([
  latchTextKeys.role,
  latchTextKeys.status,
  latchTextKeys.capabilities,
  latchTextKeys.organization,
  latchTextKeys.policyVersion,
  "latch.revokedAt",
]);

export interface ProtectedAgentRecords {
  agentWallet: Address;
  role: AgentRole;
  status: AgentStatus;
  capabilities: Capability[];
  organization: string;
  policyVersion: string;
}

export interface EnsWriteResult {
  transactionHash: Hash;
  identity: EnsAgentIdentity;
}

@Injectable()
export class EnsAdminService {
  constructor(
    @Inject(EnsService) private readonly ens: EnsService,
    @Inject(EnsTransactionGateway)
    private readonly transactions: EnsTransactionGateway,
  ) {}

  async setProtectedAgentRecords(
    unsafeName: string,
    records: ProtectedAgentRecords,
  ): Promise<EnsWriteResult> {
    const { name, resolver } =
      await this.requirePermissionedResolver(unsafeName);
    await this.requireAdminRoles(resolver, ROLE_SET_ADDR | ROLE_SET_TEXT);
    const encodedName = toHex(packetToBytes(name));
    const values: ReadonlyArray<readonly [string, string]> = [
      [latchTextKeys.role, records.role],
      [latchTextKeys.status, records.status],
      [latchTextKeys.capabilities, records.capabilities.join(",")],
      [latchTextKeys.organization, normalize(records.organization)],
      [latchTextKeys.policyVersion, records.policyVersion],
    ];
    const transactionHash = await this.transactions.multicall(resolver, [
      encodeFunctionData({
        abi: permissionedResolverAbi,
        functionName: "setAddress",
        args: [encodedName, 60n, getAddress(records.agentWallet)],
      }),
      ...values.map(([key, value]) =>
        this.encodeSetText(encodedName, key, value),
      ),
    ]);
    const identity = await this.ens.resolveAgent(name);
    if (identity.wallet?.toLowerCase() !== records.agentWallet.toLowerCase()) {
      throw new Error(
        "ENS record transaction confirmed but address read-after-write verification failed",
      );
    }
    return { transactionHash, identity };
  }

  async grantSafeRecordPermission(
    unsafeName: string,
    agentWallet: Address,
  ): Promise<EnsWriteResult> {
    return this.setSafeRecordPermission(unsafeName, agentWallet, true);
  }

  async revokeSafeRecordPermission(
    unsafeName: string,
    agentWallet: Address,
  ): Promise<EnsWriteResult> {
    return this.setSafeRecordPermission(unsafeName, agentWallet, false);
  }

  async revokeAgent(
    unsafeName: string,
    agentWallet: Address,
  ): Promise<EnsWriteResult> {
    const { name, resolver } =
      await this.requirePermissionedResolver(unsafeName);
    await this.requireAdminRoles(resolver, ROLE_SET_TEXT | ROLE_SET_TEXT_ADMIN);
    const encodedName = toHex(packetToBytes(name));
    const calls = [
      this.encodeSetText(encodedName, latchTextKeys.status, "revoked"),
      this.encodeSetText(
        encodedName,
        "latch.revokedAt",
        new Date().toISOString(),
      ),
      encodeFunctionData({
        abi: permissionedResolverAbi,
        functionName: "revokeRoles",
        args: [
          this.textResource(SAFE_AGENT_TEXT_KEY),
          ROLE_SET_TEXT,
          getAddress(agentWallet),
        ],
      }),
    ];
    const transactionHash = await this.transactions.multicall(resolver, calls);
    const identity = await this.ens.resolveAgent(name);
    if (identity.status !== "revoked") {
      throw new Error(
        "ENS revocation transaction confirmed but read-after-write verification failed",
      );
    }
    return { transactionHash, identity };
  }

  isProtectedKey(key: string): boolean {
    return protectedKeys.has(key);
  }

  private async setSafeRecordPermission(
    unsafeName: string,
    agentWallet: Address,
    grant: boolean,
  ): Promise<EnsWriteResult> {
    const { name, resolver } =
      await this.requirePermissionedResolver(unsafeName);
    await this.requireAdminRoles(resolver, ROLE_SET_TEXT_ADMIN);
    const encodedName = toHex(packetToBytes(name));
    const account = getAddress(agentWallet);
    const transactionHash = grant
      ? await this.transactions.grantSetterRoles(
          resolver,
          encodeFunctionData({
            abi: permissionedResolverAbi,
            functionName: "setText",
            args: [encodedName, SAFE_AGENT_TEXT_KEY, ""],
          }),
          account,
        )
      : await this.transactions.revokeRoles(
          resolver,
          this.textResource(SAFE_AGENT_TEXT_KEY),
          ROLE_SET_TEXT,
          account,
        );
    return { transactionHash, identity: await this.ens.resolveAgent(name) };
  }

  private async requirePermissionedResolver(unsafeName: string) {
    const name = normalize(unsafeName.trim());
    const identity = await this.ens.resolveAgent(name);
    if (!identity.resolver)
      throw new BadRequestException("ENS name has no active resolver");
    return { name, resolver: getAddress(identity.resolver) };
  }

  private async requireAdminRoles(
    resolver: Address,
    roles: bigint,
  ): Promise<void> {
    const admin = this.transactions.getAdminAddress();
    const authorized = await this.transactions.hasRoles(
      resolver,
      0n,
      roles,
      admin,
    );
    if (!authorized) {
      throw new UnauthorizedException(
        "Configured admin lacks required Permissioned Resolver roles",
      );
    }
  }

  private encodeSetText(name: Hex, key: string, value: string): Hex {
    if (!protectedKeys.has(key))
      throw new BadRequestException("Unsupported protected ENS record");
    return encodeFunctionData({
      abi: permissionedResolverAbi,
      functionName: "setText",
      args: [name, key, value],
    });
  }

  private textResource(key: string): bigint {
    return BigInt(keccak256(stringToHex(key)));
  }
}
