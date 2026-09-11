import {
  ENSV2_HACKATHON_ETH_REGISTRY_ADDRESS,
  ENSV2_HACKATHON_PERMISSIONED_RESOLVER_IMPL_ADDRESS,
  ENSV2_HACKATHON_UNIVERSAL_RESOLVER_ADDRESS,
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
const AVAILABLE = 0;
const REGISTERED = 2;
const ALL_ROLES =
  0x1111111111111111111111111111111111111111111111111111111111111111n;

const ethRegistryAbi = parseAbi([
  "function getResolver(string label) view returns (address)",
  "function getSubregistry(string label) view returns (address)",
  "function getExpiry(uint256 anyId) view returns (uint64)",
]);
const userRegistryAbi = parseAbi([
  "function getStatus(uint256 anyId) view returns (uint8)",
  "function getOwner(uint256 anyId) view returns (address)",
  "function getResolver(string label) view returns (address)",
  "function setResolver(uint256 anyId, address resolver)",
  "function register(string label, address owner, address registry, address resolver, uint256 roleBitmap, uint64 expiry) returns (uint256 tokenId)",
]);
const factoryAbi = parseAbi([
  "function deployProxy(address implementation, uint256 salt, bytes data) returns (address proxy)",
  "event ProxyDeployed(address indexed sender, address indexed proxyAddress, uint256 salt, address implementation)",
]);
const resolverInitAbi = parseAbi([
  "function initialize((address account, uint256 roleBitmap)[] grants, bytes[] calls)",
]);

function required(value: string | undefined, variable: string): string {
  if (!value) throw new Error(`${variable} must be configured in .env`);
  return value;
}

function parseChildName(value: string, parentName: string): string {
  const name = normalize(value);
  const suffix = `.${parentName}`;
  if (!name.endsWith(suffix) || name.slice(0, -suffix.length).includes(".")) {
    throw new Error(`${value} must be a direct child of ${parentName}`);
  }
  return name.slice(0, -suffix.length);
}

const rpcUrl = required(process.env.SEPOLIA_RPC_URL, "SEPOLIA_RPC_URL");
const privateKey = required(
  process.env.SEPOLIA_DEPLOYER_PRIVATE_KEY,
  "SEPOLIA_DEPLOYER_PRIVATE_KEY",
) as Hex;
const parentName = normalize(
  required(process.env.DEMO_ORG_ENS, "DEMO_ORG_ENS"),
);
const parentLabel = parentName.split(".")[0];
if (!parentLabel || parentName !== `${parentLabel}.eth`) {
  throw new Error("DEMO_ORG_ENS must be a normalized second-level .eth name");
}
const childLabels = [
  parseChildName(
    required(
      process.env.DEMO_PROCUREMENT_AGENT_ENS,
      "DEMO_PROCUREMENT_AGENT_ENS",
    ),
    parentName,
  ),
  parseChildName(
    required(process.env.DEMO_TRAVEL_AGENT_ENS, "DEMO_TRAVEL_AGENT_ENS"),
    parentName,
  ),
];

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

async function deployChildResolver(version: bigint): Promise<{
  address: Address;
  hash: Hash;
}> {
  const salt = BigInt(
    keccak256(
      encodeAbiParameters(
        [{ type: "bytes32" }, { type: "address" }, { type: "uint256" }],
        [keccak256(stringToHex("OwnedResolver")), account.address, version],
      ),
    ),
  );
  const initData = encodeFunctionData({
    abi: resolverInitAbi,
    functionName: "initialize",
    args: [[{ account: account.address, roleBitmap: ALL_ROLES }], []],
  });
  const simulation = await publicClient.simulateContract({
    account,
    address: ENSV2_HACKATHON_VERIFIABLE_FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: "deployProxy",
    args: [ENSV2_HACKATHON_PERMISSIONED_RESOLVER_IMPL_ADDRESS, salt, initData],
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

async function setChildResolver(
  registry: Address,
  labelId: bigint,
  resolverAddress: Address,
): Promise<Hash> {
  const simulation = await publicClient.simulateContract({
    account,
    address: registry,
    abi: userRegistryAbi,
    functionName: "setResolver",
    args: [labelId, resolverAddress],
  });
  const hash = await walletClient.writeContract(simulation.request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success")
    throw new Error(`Transaction ${hash} failed`);
  return hash;
}

const [resolver, subregistry, parentExpiry] = await Promise.all([
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
  publicClient.readContract({
    address: ENSV2_HACKATHON_ETH_REGISTRY_ADDRESS,
    abi: ethRegistryAbi,
    functionName: "getExpiry",
    args: [parentId],
  }),
]);

if (resolver === ZERO_ADDRESS || subregistry === ZERO_ADDRESS) {
  throw new Error("Run npm run ens:setup -- --execute before creating agents");
}

console.log(execute ? "ENSv2 child execution mode" : "ENSv2 child dry run");
console.table({ parentName, admin: account.address, resolver, subregistry });

const transactions: Record<string, Hash> = {};
let missingNames = 0;
for (const [index, label] of childLabels.entries()) {
  const labelId = BigInt(keccak256(stringToHex(label)));
  let status = Number(
    await publicClient.readContract({
      address: subregistry,
      abi: userRegistryAbi,
      functionName: "getStatus",
      args: [labelId],
    }),
  );
  if (status === AVAILABLE) missingNames += 1;

  if (status === AVAILABLE && execute) {
    const simulation = await publicClient.simulateContract({
      account,
      address: subregistry,
      abi: userRegistryAbi,
      functionName: "register",
      args: [
        label,
        account.address,
        ZERO_ADDRESS,
        resolver,
        ALL_ROLES,
        parentExpiry,
      ],
    });
    const hash = await walletClient.writeContract(simulation.request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success")
      throw new Error(`Transaction ${hash} failed`);
    transactions[label] = hash;
    status = Number(
      await publicClient.readContract({
        address: subregistry,
        abi: userRegistryAbi,
        functionName: "getStatus",
        args: [labelId],
      }),
    );
  }

  const owner =
    status === REGISTERED
      ? await publicClient.readContract({
          address: subregistry,
          abi: userRegistryAbi,
          functionName: "getOwner",
          args: [labelId],
        })
      : ZERO_ADDRESS;
  let childResolver = await publicClient.readContract({
    address: subregistry,
    abi: userRegistryAbi,
    functionName: "getResolver",
    args: [label],
  });

  if (execute && status === REGISTERED && childResolver === resolver) {
    const deployed = await deployChildResolver(BigInt(index + 1));
    transactions[`${label}Resolver`] = deployed.hash;
    transactions[`${label}AttachResolver`] = await setChildResolver(
      subregistry,
      labelId,
      deployed.address,
    );
    childResolver = await publicClient.readContract({
      address: subregistry,
      abi: userRegistryAbi,
      functionName: "getResolver",
      args: [label],
    });
  }

  console.table({
    name: `${label}.${parentName}`,
    status:
      status === REGISTERED
        ? "registered"
        : status === AVAILABLE
          ? "available"
          : "reserved",
    owner,
    resolver: childResolver,
    transaction: transactions[label] ?? "none",
    resolverDeployment: transactions[`${label}Resolver`] ?? "none",
    resolverAttachment: transactions[`${label}AttachResolver`] ?? "none",
  });

  if (
    execute &&
    (status !== REGISTERED ||
      childResolver === ZERO_ADDRESS ||
      childResolver === resolver)
  ) {
    throw new Error(
      `${label}.${parentName} failed read-after-write verification`,
    );
  }
}

if (!execute && missingNames > 0) {
  console.log(
    "Run npm run ens:create-agents -- --execute to create missing names.",
  );
} else if (!execute) {
  console.log("Both configured ENSv2 agent names are already registered.");
}
