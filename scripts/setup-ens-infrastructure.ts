import {
  ENSV2_HACKATHON_ETH_REGISTRY_ADDRESS,
  ENSV2_HACKATHON_PERMISSIONED_RESOLVER_IMPL_ADDRESS,
  ENSV2_HACKATHON_UNIVERSAL_RESOLVER_ADDRESS,
  ENSV2_HACKATHON_USER_REGISTRY_IMPL_ADDRESS,
  ENSV2_HACKATHON_VERIFIABLE_FACTORY_ADDRESS,
} from "@latch/shared";
import {
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  http,
  keccak256,
  namehash,
  parseAbi,
  parseEventLogs,
  stringToHex,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { normalize } from "viem/ens";
import { createEnsV2HackathonChain } from "../apps/api/src/ens/ens.constants.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ALL_ROLES =
  0x1111111111111111111111111111111111111111111111111111111111111111n;

const factoryAbi = parseAbi([
  "function deployProxy(address implementation, uint256 salt, bytes data) returns (address proxy)",
  "event ProxyDeployed(address indexed sender, address indexed proxyAddress, uint256 salt, address implementation)",
]);
const resolverInitAbi = parseAbi([
  "function initialize((address account, uint256 roleBitmap)[] grants, bytes[] calls)",
]);
const registryInitAbi = parseAbi([
  "function initialize((address account, uint256 roleBitmap)[] grants)",
]);
const ethRegistryAbi = parseAbi([
  "function getResolver(string label) view returns (address)",
  "function getSubregistry(string label) view returns (address)",
  "function getExpiry(uint256 anyId) view returns (uint64)",
  "function setResolver(uint256 anyId, address resolver)",
  "function setSubregistry(uint256 anyId, address subregistry)",
]);

function required(value: string | undefined, variable: string): string {
  if (!value) throw new Error(`${variable} must be configured in .env`);
  return value;
}

function deploymentSalt(
  kind: "OwnedResolver" | "UserRegistry",
  identity: Address | Hex,
): bigint {
  const identityType = kind === "OwnedResolver" ? "address" : "bytes32";
  return BigInt(
    keccak256(
      encodeAbiParameters(
        [
          { type: "bytes32" },
          { type: identityType },
          { type: "uint256" },
        ] as const,
        [keccak256(stringToHex(kind)), identity, 0n] as never,
      ),
    ),
  );
}

const rpcUrl = required(process.env.SEPOLIA_RPC_URL, "SEPOLIA_RPC_URL");
const privateKey = required(
  process.env.SEPOLIA_DEPLOYER_PRIVATE_KEY,
  "SEPOLIA_DEPLOYER_PRIVATE_KEY",
) as Hex;
const parentName = normalize(
  required(process.env.DEMO_ORG_ENS, "DEMO_ORG_ENS"),
);
const labels = parentName.split(".");
const parentLabel = labels[0];
if (!parentLabel || labels.length !== 2 || labels[1] !== "eth") {
  throw new Error("DEMO_ORG_ENS must be a normalized second-level .eth name");
}

const account = privateKeyToAccount(privateKey);
if (
  process.env.ADMIN_WALLET_ADDRESS &&
  getAddress(process.env.ADMIN_WALLET_ADDRESS) !== getAddress(account.address)
) {
  throw new Error(
    "SEPOLIA_DEPLOYER_PRIVATE_KEY does not match ADMIN_WALLET_ADDRESS",
  );
}

const chain = createEnsV2HackathonChain(
  process.env.ENSV2_UNIVERSAL_RESOLVER_ADDRESS ??
    ENSV2_HACKATHON_UNIVERSAL_RESOLVER_ADDRESS,
);
const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
const walletClient = createWalletClient({
  account,
  chain,
  transport: http(rpcUrl),
});
const execute = process.argv.includes("--execute");
const parentId = BigInt(keccak256(stringToHex(parentLabel)));

async function deployProxy(
  implementation: Address,
  salt: bigint,
  initData: Hex,
): Promise<{ address: Address; hash: Hash }> {
  const simulation = await publicClient.simulateContract({
    account,
    address: ENSV2_HACKATHON_VERIFIABLE_FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: "deployProxy",
    args: [implementation, salt, initData],
  });
  const hash = await walletClient.writeContract(simulation.request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success")
    throw new Error(`Transaction ${hash} failed`);
  const [event] = parseEventLogs({
    abi: factoryAbi,
    eventName: "ProxyDeployed",
    logs: receipt.logs,
  });
  if (!event) throw new Error(`ProxyDeployed event missing from ${hash}`);
  return { address: getAddress(event.args.proxyAddress), hash };
}

async function writeParentPointer(
  functionName: "setResolver" | "setSubregistry",
  address: Address,
): Promise<Hash> {
  const simulation = await publicClient.simulateContract({
    account,
    address: ENSV2_HACKATHON_ETH_REGISTRY_ADDRESS,
    abi: ethRegistryAbi,
    functionName,
    args: [parentId, address],
  });
  const hash = await walletClient.writeContract(simulation.request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success")
    throw new Error(`Transaction ${hash} failed`);
  return hash;
}

let resolver = await publicClient.readContract({
  address: ENSV2_HACKATHON_ETH_REGISTRY_ADDRESS,
  abi: ethRegistryAbi,
  functionName: "getResolver",
  args: [parentLabel],
});
let subregistry = await publicClient.readContract({
  address: ENSV2_HACKATHON_ETH_REGISTRY_ADDRESS,
  abi: ethRegistryAbi,
  functionName: "getSubregistry",
  args: [parentLabel],
});
const expiry = await publicClient.readContract({
  address: ENSV2_HACKATHON_ETH_REGISTRY_ADDRESS,
  abi: ethRegistryAbi,
  functionName: "getExpiry",
  args: [parentId],
});

console.table({
  mode: execute ? "execute" : "dry-run",
  parentName,
  admin: account.address,
  parentExpiry: new Date(Number(expiry) * 1_000).toISOString(),
  currentResolver: resolver,
  currentSubregistry: subregistry,
});

if (!execute) {
  console.log(
    resolver === ZERO_ADDRESS || subregistry === ZERO_ADDRESS
      ? "Run npm run ens:setup -- --execute to deploy and attach missing infrastructure."
      : "ENSv2 parent infrastructure is already complete; no write is needed.",
  );
  process.exit(0);
}

const transactions: Record<string, Hash> = {};
if (resolver === ZERO_ADDRESS) {
  const initData = encodeFunctionData({
    abi: resolverInitAbi,
    functionName: "initialize",
    args: [[{ account: account.address, roleBitmap: ALL_ROLES }], []],
  });
  const deployed = await deployProxy(
    ENSV2_HACKATHON_PERMISSIONED_RESOLVER_IMPL_ADDRESS,
    deploymentSalt("OwnedResolver", account.address),
    initData,
  );
  resolver = deployed.address;
  transactions.deployResolver = deployed.hash;
  transactions.attachResolver = await writeParentPointer(
    "setResolver",
    resolver,
  );
}

if (subregistry === ZERO_ADDRESS) {
  const initData = encodeFunctionData({
    abi: registryInitAbi,
    functionName: "initialize",
    args: [[{ account: account.address, roleBitmap: ALL_ROLES }]],
  });
  const deployed = await deployProxy(
    ENSV2_HACKATHON_USER_REGISTRY_IMPL_ADDRESS,
    deploymentSalt("UserRegistry", namehash(parentName)),
    initData,
  );
  subregistry = deployed.address;
  transactions.deploySubregistry = deployed.hash;
  transactions.attachSubregistry = await writeParentPointer(
    "setSubregistry",
    subregistry,
  );
}

const [verifiedResolver, verifiedSubregistry] = await Promise.all([
  publicClient.readContract({
    address: ENSV2_HACKATHON_ETH_REGISTRY_ADDRESS,
    abi: ethRegistryAbi,
    functionName: "getResolver",
    args: [parentLabel],
  }),
  publicClient.readContract({
    address: ENSV2_HACKATHON_ETH_REGISTRY_ADDRESS,
    abi: ethRegistryAbi,
    functionName: "getSubregistry",
    args: [parentLabel],
  }),
]);
if (verifiedResolver === ZERO_ADDRESS || verifiedSubregistry === ZERO_ADDRESS) {
  throw new Error("Parent infrastructure failed read-after-write verification");
}

console.table({
  parentName,
  resolver: verifiedResolver,
  subregistry: verifiedSubregistry,
  ...transactions,
});
