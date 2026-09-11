import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  ENSV2_HACKATHON_ETH_REGISTRAR_ADDRESS,
  ENSV2_HACKATHON_MOCK_USDC_ADDRESS,
  ENSV2_HACKATHON_UNIVERSAL_RESOLVER_ADDRESS,
} from "@latch/shared";
import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  getAddress,
  http,
  parseAbi,
  zeroAddress,
  zeroHash,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createEnsV2HackathonChain } from "../apps/api/src/ens/ens.constants.js";

const registrarAbi = parseAbi([
  "function MIN_COMMITMENT_AGE() view returns (uint64)",
  "function MAX_COMMITMENT_AGE() view returns (uint64)",
  "function MIN_REGISTER_DURATION() view returns (uint64)",
  "function isAvailable(string label) view returns (bool)",
  "function getRegisterPrice(string label, uint64 duration, address paymentToken) view returns (uint256 base, uint256 premium)",
  "function makeCommitment(string label, address owner, bytes32 secret, address subregistry, address resolver, uint64 duration, bytes32 referrer) pure returns (bytes32)",
  "function commitmentAt(bytes32 commitment) view returns (uint64)",
  "function commit(bytes32 commitment)",
  "function register(string label, address owner, bytes32 secret, address subregistry, address resolver, uint64 duration, address paymentToken, bytes32 referrer) returns (uint256 tokenId)",
]);

const tokenAbi = parseAbi([
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function mint(address to, uint256 amount)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);

interface RegistrationState {
  label: string;
  owner: `0x${string}`;
  secret: Hex;
  duration: string;
  commitment: Hex;
  commitTransaction?: Hex;
  registerTransaction?: Hex;
}

const statePath = resolve("evidence/ens/registration.secret.json");
const labelOption = process.argv.find((value) => value.startsWith("--label="));
const label = (labelOption?.slice(8) ?? "latchsecurity")
  .trim()
  .toLowerCase()
  .replace(/\.eth$/, "");
const execute = process.argv.includes("--execute");
const shouldRegister = process.argv.includes("--register");

if (!/^[a-z0-9-]+$/.test(label)) {
  throw new Error(
    "The label must contain only normalized letters, numbers, or hyphens",
  );
}

const rpcUrl = process.env.SEPOLIA_RPC_URL;
const privateKey = process.env.SEPOLIA_DEPLOYER_PRIVATE_KEY as Hex | undefined;
if (!rpcUrl) throw new Error("SEPOLIA_RPC_URL is required");
if (!privateKey || !/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
  throw new Error("SEPOLIA_DEPLOYER_PRIVATE_KEY is required");
}

const account = privateKeyToAccount(privateKey);
if (
  process.env.ADMIN_WALLET_ADDRESS &&
  getAddress(process.env.ADMIN_WALLET_ADDRESS) !== getAddress(account.address)
) {
  throw new Error("Registration signer does not match ADMIN_WALLET_ADDRESS");
}

const chain = createEnsV2HackathonChain(
  process.env.ENSV2_UNIVERSAL_RESOLVER_ADDRESS ??
    ENSV2_HACKATHON_UNIVERSAL_RESOLVER_ADDRESS,
);
const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
});
const walletClient = createWalletClient({
  account,
  chain,
  transport: http(rpcUrl),
});

async function loadState(): Promise<RegistrationState | undefined> {
  try {
    return JSON.parse(await readFile(statePath, "utf8")) as RegistrationState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

async function saveState(state: RegistrationState): Promise<void> {
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, {
    mode: 0o600,
  });
}

async function confirm(hash: Hex): Promise<Hex> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success")
    throw new Error(`Transaction ${hash} reverted`);
  return hash;
}

async function main(): Promise<void> {
  const [available, symbol, decimals, minimumAge, maximumAge, minimumDuration] =
    await Promise.all([
      publicClient.readContract({
        address: ENSV2_HACKATHON_ETH_REGISTRAR_ADDRESS,
        abi: registrarAbi,
        functionName: "isAvailable",
        args: [label],
      }),
      publicClient.readContract({
        address: ENSV2_HACKATHON_MOCK_USDC_ADDRESS,
        abi: tokenAbi,
        functionName: "symbol",
      }),
      publicClient.readContract({
        address: ENSV2_HACKATHON_MOCK_USDC_ADDRESS,
        abi: tokenAbi,
        functionName: "decimals",
      }),
      publicClient.readContract({
        address: ENSV2_HACKATHON_ETH_REGISTRAR_ADDRESS,
        abi: registrarAbi,
        functionName: "MIN_COMMITMENT_AGE",
      }),
      publicClient.readContract({
        address: ENSV2_HACKATHON_ETH_REGISTRAR_ADDRESS,
        abi: registrarAbi,
        functionName: "MAX_COMMITMENT_AGE",
      }),
      publicClient.readContract({
        address: ENSV2_HACKATHON_ETH_REGISTRAR_ADDRESS,
        abi: registrarAbi,
        functionName: "MIN_REGISTER_DURATION",
      }),
    ]);

  const oneYear = 31_556_952n;
  const duration = oneYear < minimumDuration ? minimumDuration : oneYear;
  const priorState = await loadState();
  if (!available && priorState?.registerTransaction) {
    console.log(
      `${label}.eth is already registered: ${priorState.registerTransaction}`,
    );
    return;
  }
  if (!available) throw new Error(`${label}.eth is not available`);
  const [base, premium] = await publicClient.readContract({
    address: ENSV2_HACKATHON_ETH_REGISTRAR_ADDRESS,
    abi: registrarAbi,
    functionName: "getRegisterPrice",
    args: [label, duration, ENSV2_HACKATHON_MOCK_USDC_ADDRESS],
  });
  const price = base + premium;
  const balance = await publicClient.readContract({
    address: ENSV2_HACKATHON_MOCK_USDC_ADDRESS,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: [account.address],
  });

  console.table({
    name: `${label}.eth`,
    available,
    owner: account.address,
    registrar: ENSV2_HACKATHON_ETH_REGISTRAR_ADDRESS,
    paymentToken: `${symbol} (${ENSV2_HACKATHON_MOCK_USDC_ADDRESS})`,
    price: `${formatUnits(price, decimals)} ${symbol}`,
    balance: `${formatUnits(balance, decimals)} ${symbol}`,
    durationSeconds: duration.toString(),
    commitmentWindow: `${minimumAge}-${maximumAge} seconds`,
    mode: shouldRegister ? "register" : execute ? "commit" : "dry run",
  });

  if (!execute && !shouldRegister) process.exit(0);

  let state = priorState;
  if (state && (state.label !== label || state.owner !== account.address)) {
    throw new Error(
      `Protected state belongs to ${state.label}.eth and ${state.owner}`,
    );
  }
  if (!state) {
    const secret = `0x${randomBytes(32).toString("hex")}` as Hex;
    const commitment = await publicClient.readContract({
      address: ENSV2_HACKATHON_ETH_REGISTRAR_ADDRESS,
      abi: registrarAbi,
      functionName: "makeCommitment",
      args: [
        label,
        account.address,
        secret,
        zeroAddress,
        zeroAddress,
        duration,
        zeroHash,
      ],
    });
    state = {
      label,
      owner: account.address,
      secret,
      duration: duration.toString(),
      commitment,
    };
    await saveState(state);
  }

  const commitmentTime = await publicClient.readContract({
    address: ENSV2_HACKATHON_ETH_REGISTRAR_ADDRESS,
    abi: registrarAbi,
    functionName: "commitmentAt",
    args: [state.commitment],
  });

  if (!shouldRegister) {
    if (commitmentTime > 0n) {
      console.log(
        `Commitment already recorded at ${commitmentTime}; run with --register.`,
      );
      process.exit(0);
    }
    if (balance < price) {
      const mintAmount = 20n * 10n ** BigInt(decimals);
      const request = await publicClient.simulateContract({
        account,
        address: ENSV2_HACKATHON_MOCK_USDC_ADDRESS,
        abi: tokenAbi,
        functionName: "mint",
        args: [account.address, mintAmount],
      });
      console.log(
        `Minted 20 ${symbol}: ${await confirm(await walletClient.writeContract(request.request))}`,
      );
    }
    const allowance = await publicClient.readContract({
      address: ENSV2_HACKATHON_MOCK_USDC_ADDRESS,
      abi: tokenAbi,
      functionName: "allowance",
      args: [account.address, ENSV2_HACKATHON_ETH_REGISTRAR_ADDRESS],
    });
    if (allowance < price) {
      const request = await publicClient.simulateContract({
        account,
        address: ENSV2_HACKATHON_MOCK_USDC_ADDRESS,
        abi: tokenAbi,
        functionName: "approve",
        args: [ENSV2_HACKATHON_ETH_REGISTRAR_ADDRESS, price],
      });
      console.log(
        `Approved fee: ${await confirm(await walletClient.writeContract(request.request))}`,
      );
    }
    const request = await publicClient.simulateContract({
      account,
      address: ENSV2_HACKATHON_ETH_REGISTRAR_ADDRESS,
      abi: registrarAbi,
      functionName: "commit",
      args: [state.commitment],
    });
    state.commitTransaction = await confirm(
      await walletClient.writeContract(request.request),
    );
    await saveState(state);
    console.log(`Commitment confirmed: ${state.commitTransaction}`);
    console.log(
      `Wait at least ${minimumAge} seconds, then rerun with --register.`,
    );
    process.exit(0);
  }

  if (commitmentTime === 0n)
    throw new Error("No onchain commitment; run with --execute first");
  const age = (await publicClient.getBlock()).timestamp - commitmentTime;
  if (age < minimumAge)
    throw new Error(`Commitment needs ${minimumAge - age} more seconds`);
  if (age > maximumAge)
    throw new Error("Commitment expired; create a new protected state");

  const [latestBalance, latestAllowance] = await Promise.all([
    publicClient.readContract({
      address: ENSV2_HACKATHON_MOCK_USDC_ADDRESS,
      abi: tokenAbi,
      functionName: "balanceOf",
      args: [account.address],
    }),
    publicClient.readContract({
      address: ENSV2_HACKATHON_MOCK_USDC_ADDRESS,
      abi: tokenAbi,
      functionName: "allowance",
      args: [account.address, ENSV2_HACKATHON_ETH_REGISTRAR_ADDRESS],
    }),
  ]);
  if (latestBalance < price) throw new Error(`Insufficient ${symbol} balance`);
  if (latestAllowance < price)
    throw new Error(`Insufficient ${symbol} allowance`);

  const request = await publicClient.simulateContract({
    account,
    address: ENSV2_HACKATHON_ETH_REGISTRAR_ADDRESS,
    abi: registrarAbi,
    functionName: "register",
    args: [
      state.label,
      state.owner,
      state.secret,
      zeroAddress,
      zeroAddress,
      BigInt(state.duration),
      ENSV2_HACKATHON_MOCK_USDC_ADDRESS,
      zeroHash,
    ],
  });
  state.registerTransaction = await confirm(
    await walletClient.writeContract(request.request),
  );
  await saveState(state);
  console.log(`Registered ${state.label}.eth: ${state.registerTransaction}`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
