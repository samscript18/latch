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
  concat,
  encodeFunctionData,
  getAddress,
  keccak256,
  toHex,
  zeroHash,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { namehash, normalize, packetToBytes } from "viem/ens";
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
    await this.requireAdminRoles(name, resolver, ROLE_SET_ADDR | ROLE_SET_TEXT);
    const node = namehash(name);
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
        functionName: "setAddr",
        args: [node, getAddress(records.agentWallet)],
      }),
      ...values.map(([key, value]) => this.encodeSetText(node, key, value)),
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
    await this.requireAdminRoles(
      name,
      resolver,
      ROLE_SET_TEXT | ROLE_SET_TEXT_ADMIN,
    );
    const node = namehash(name);
    const calls = [
      this.encodeSetText(node, latchTextKeys.status, "revoked"),
      this.encodeSetText(node, "latch.revokedAt", new Date().toISOString()),
      encodeFunctionData({
        abi: permissionedResolverAbi,
        functionName: "authorizeTextRoles",
        args: [
          toHex(packetToBytes(name)),
          SAFE_AGENT_TEXT_KEY,
          getAddress(agentWallet),
          false,
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
    await this.requireAdminRoles(name, resolver, ROLE_SET_TEXT_ADMIN);
    const transactionHash = await this.transactions.authorizeText(
      resolver,
      toHex(packetToBytes(name)),
      SAFE_AGENT_TEXT_KEY,
      getAddress(agentWallet),
      grant,
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
    name: string,
    resolver: Address,
    roles: bigint,
  ): Promise<void> {
    const admin = this.transactions.getAdminAddress();
    const resource = BigInt(keccak256(concat([namehash(name), zeroHash])));
    const authorized = await this.transactions.hasRoles(
      resolver,
      resource,
      roles,
      admin,
    );
    if (!authorized) {
      throw new UnauthorizedException(
        "Configured admin lacks required Permissioned Resolver roles",
      );
    }
  }

  private encodeSetText(node: Hex, key: string, value: string): Hex {
    if (!protectedKeys.has(key))
      throw new BadRequestException("Unsupported protected ENS record");
    return encodeFunctionData({
      abi: permissionedResolverAbi,
      functionName: "setText",
      args: [node, key, value],
    });
  }
}
