import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { Environment } from "../config/environment.js";
import { createEnsV2HackathonChain } from "./ens.constants.js";
import { permissionedResolverAbi } from "./permissioned-resolver.abi.js";

@Injectable()
export class EnsTransactionGateway {
  private readonly rpcUrl: string | undefined;
  private readonly privateKey: Hex | undefined;
  private readonly configuredAdmin: Address | undefined;
  private readonly chain;

  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService<Environment, true>,
  ) {
    this.rpcUrl = this.config.get("SEPOLIA_RPC_URL", { infer: true });
    this.privateKey = this.config.get("SEPOLIA_DEPLOYER_PRIVATE_KEY", {
      infer: true,
    });
    this.configuredAdmin = this.config.get("ADMIN_WALLET_ADDRESS", {
      infer: true,
    });
    this.chain = createEnsV2HackathonChain(
      this.config.get("ENSV2_UNIVERSAL_RESOLVER_ADDRESS", { infer: true }),
    );
  }

  getAdminAddress(): Address {
    const account = this.getAccount();
    if (
      this.configuredAdmin &&
      getAddress(this.configuredAdmin) !== getAddress(account.address)
    ) {
      throw new ServiceUnavailableException(
        "Configured ENS signer does not match ADMIN_WALLET_ADDRESS",
      );
    }
    return account.address;
  }

  async hasRoles(
    resolver: Address,
    resource: bigint,
    roleBitmap: bigint,
    account: Address,
  ): Promise<boolean> {
    const result = await this.publicClient().readContract({
      address: resolver,
      abi: permissionedResolverAbi,
      functionName: "hasRoles",
      args: [resource, roleBitmap, account],
    });
    return result;
  }

  async grantSetterRoles(
    resolver: Address,
    setter: Hex,
    account: Address,
  ): Promise<Hash> {
    const signer = this.getAccount();
    const client = this.publicClient();
    const simulation = await client.simulateContract({
      account: signer,
      address: resolver,
      abi: permissionedResolverAbi,
      functionName: "grantSetterRoles",
      args: [setter, account],
    });
    const hash = await this.walletClient().writeContract(simulation.request);
    await client.waitForTransactionReceipt({ hash });
    return hash;
  }

  async revokeRoles(
    resolver: Address,
    resource: bigint,
    roleBitmap: bigint,
    account: Address,
  ): Promise<Hash> {
    const signer = this.getAccount();
    const client = this.publicClient();
    const simulation = await client.simulateContract({
      account: signer,
      address: resolver,
      abi: permissionedResolverAbi,
      functionName: "revokeRoles",
      args: [resource, roleBitmap, account],
    });
    const hash = await this.walletClient().writeContract(simulation.request);
    await client.waitForTransactionReceipt({ hash });
    return hash;
  }

  async multicall(resolver: Address, calls: readonly Hex[]): Promise<Hash> {
    const signer = this.getAccount();
    const client = this.publicClient();
    const simulation = await client.simulateContract({
      account: signer,
      address: resolver,
      abi: permissionedResolverAbi,
      functionName: "multicall",
      args: [[...calls]],
    });
    const hash = await this.walletClient().writeContract(simulation.request);
    await client.waitForTransactionReceipt({ hash });
    return hash;
  }

  private getAccount() {
    if (!this.privateKey) {
      throw new ServiceUnavailableException(
        "SEPOLIA_DEPLOYER_PRIVATE_KEY is not configured",
      );
    }
    return privateKeyToAccount(this.privateKey);
  }

  private publicClient() {
    if (!this.rpcUrl)
      throw new ServiceUnavailableException(
        "SEPOLIA_RPC_URL is not configured",
      );
    return createPublicClient({
      chain: this.chain,
      transport: http(this.rpcUrl),
    });
  }

  private walletClient() {
    if (!this.rpcUrl)
      throw new ServiceUnavailableException(
        "SEPOLIA_RPC_URL is not configured",
      );
    return createWalletClient({
      account: this.getAccount(),
      chain: this.chain,
      transport: http(this.rpcUrl),
    });
  }
}
