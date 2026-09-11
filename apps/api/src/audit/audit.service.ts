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
  keccak256,
  stringToHex,
  type Hash,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { namehash, normalize } from "viem/ens";
import { sepolia } from "viem/chains";
import type { Environment } from "../config/environment.js";
import { latchAuditAbi } from "./latch-audit.abi.js";

export interface AuditAction {
  taskId: string;
  agentName: string;
}

@Injectable()
export class AuditService {
  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService<Environment, true>,
  ) {}

  recordRequested(
    action: AuditAction & { capability: string; amountCents: number },
  ): Promise<Hash | null> {
    return this.write("recordRequested", [
      this.hash(action.taskId),
      namehash(normalize(action.agentName)),
      this.hash(action.capability),
      BigInt(action.amountCents),
    ]);
  }

  recordAuthorized(
    action: AuditAction & { policyVersion: string },
  ): Promise<Hash | null> {
    return this.write("recordAuthorized", [
      this.hash(action.taskId),
      namehash(normalize(action.agentName)),
      this.hash(action.policyVersion),
    ]);
  }

  recordBlocked(
    action: AuditAction & { reasonCode: string },
  ): Promise<Hash | null> {
    return this.write("recordBlocked", [
      this.hash(action.taskId),
      namehash(normalize(action.agentName)),
      this.hash(action.reasonCode),
    ]);
  }

  recordExecuted(
    action: AuditAction & { executionReference: string },
  ): Promise<Hash | null> {
    return this.write("recordExecuted", [
      this.hash(action.taskId),
      namehash(normalize(action.agentName)),
      this.hash(action.executionReference),
    ]);
  }

  async status() {
    const contract = this.config.get("AUDIT_CONTRACT_ADDRESS", { infer: true });
    const rpcUrl = this.config.get("SEPOLIA_RPC_URL", { infer: true });
    if (!contract || !rpcUrl) {
      return {
        network: "sepolia",
        state: "missing_configuration",
        address: contract ?? null,
        recorder: null,
      };
    }
    try {
      const address = getAddress(contract);
      const client = createPublicClient({
        chain: sepolia,
        transport: http(rpcUrl, { timeout: 30_000 }),
      });
      const [code, recorder] = await Promise.all([
        client.getCode({ address }),
        client.readContract({
          address,
          abi: latchAuditAbi,
          functionName: "recorder",
        }),
      ]);
      const expectedRecorder = this.config.get("ADMIN_WALLET_ADDRESS", {
        infer: true,
      });
      const connected =
        Boolean(code && code !== "0x") &&
        (!expectedRecorder ||
          getAddress(expectedRecorder) === getAddress(recorder));
      return {
        network: "sepolia",
        state: connected ? "connected" : "verification_failed",
        address,
        recorder,
      };
    } catch {
      return {
        network: "sepolia",
        state: "verification_failed",
        address: contract,
        recorder: null,
      };
    }
  }

  private async write(
    functionName:
      | "recordRequested"
      | "recordAuthorized"
      | "recordBlocked"
      | "recordExecuted",
    args: readonly [Hex, Hex, Hex] | readonly [Hex, Hex, Hex, bigint],
  ): Promise<Hash | null> {
    const contract = this.config.get("AUDIT_CONTRACT_ADDRESS", { infer: true });
    if (!contract) {
      if (this.config.get("HACKATHON_MODE", { infer: true })) {
        throw new ServiceUnavailableException(
          "Onchain audit recorder is required in hackathon mode",
        );
      }
      return null;
    }
    const rpcUrl = this.config.get("SEPOLIA_RPC_URL", { infer: true });
    const privateKey = this.config.get("SEPOLIA_DEPLOYER_PRIVATE_KEY", {
      infer: true,
    });
    if (!rpcUrl || !privateKey) {
      throw new ServiceUnavailableException(
        "Onchain audit recorder signer is not configured",
      );
    }
    const account = privateKeyToAccount(privateKey as Hex);
    const contractAddress = getAddress(contract);
    const expectedAdmin = this.config.get("ADMIN_WALLET_ADDRESS", {
      infer: true,
    });
    if (
      expectedAdmin &&
      getAddress(expectedAdmin) !== getAddress(account.address)
    ) {
      throw new ServiceUnavailableException(
        "Onchain audit signer does not match the organization admin",
      );
    }
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(rpcUrl, { timeout: 30_000 }),
    });
    const recorder = await publicClient.readContract({
      address: contractAddress,
      abi: latchAuditAbi,
      functionName: "recorder",
    });
    if (getAddress(recorder) !== getAddress(account.address)) {
      throw new ServiceUnavailableException(
        "Configured signer is not authorized by LatchAudit",
      );
    }
    const simulation = await publicClient.simulateContract({
      account,
      address: contractAddress,
      abi: latchAuditAbi,
      functionName,
      args: args as never,
    });
    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(rpcUrl, { timeout: 30_000 }),
    });
    const hash = await walletClient.writeContract(simulation.request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") {
      throw new ServiceUnavailableException("Onchain audit transaction failed");
    }
    return hash;
  }

  private hash(value: string): Hex {
    return keccak256(stringToHex(value));
  }
}
