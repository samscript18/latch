import { ENSV2_HACKATHON_UNIVERSAL_RESOLVER_ADDRESS } from "@latch/shared";
import {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  toHex,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { normalize, packetToBytes } from "viem/ens";
import { createEnsV2HackathonChain } from "../apps/api/src/ens/ens.constants.js";
import { permissionedResolverAbi } from "../apps/api/src/ens/permissioned-resolver.abi.js";

function required(value: string | undefined, variable: string): string {
  if (!value) throw new Error(`${variable} must be configured in .env`);
  return value;
}

const rpcUrl = required(process.env.SEPOLIA_RPC_URL, "SEPOLIA_RPC_URL");
const chain = createEnsV2HackathonChain(
  process.env.ENSV2_UNIVERSAL_RESOLVER_ADDRESS ??
    ENSV2_HACKATHON_UNIVERSAL_RESOLVER_ADDRESS,
);
const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
const execute = process.argv.includes("--execute");
const agents = [
  {
    name: required(
      process.env.DEMO_PROCUREMENT_AGENT_ENS,
      "DEMO_PROCUREMENT_AGENT_ENS",
    ),
    wallet: required(
      process.env.DEMO_PROCUREMENT_AGENT_WALLET,
      "DEMO_PROCUREMENT_AGENT_WALLET",
    ),
    privateKey: required(
      process.env.DEMO_PROCUREMENT_AGENT_PRIVATE_KEY,
      "DEMO_PROCUREMENT_AGENT_PRIVATE_KEY",
    ) as Hex,
  },
  {
    name: required(process.env.DEMO_TRAVEL_AGENT_ENS, "DEMO_TRAVEL_AGENT_ENS"),
    wallet: required(
      process.env.DEMO_TRAVEL_AGENT_WALLET,
      "DEMO_TRAVEL_AGENT_WALLET",
    ),
    privateKey: required(
      process.env.DEMO_TRAVEL_AGENT_PRIVATE_KEY,
      "DEMO_TRAVEL_AGENT_PRIVATE_KEY",
    ) as Hex,
  },
];

console.log(
  execute ? "Permission proof execution mode" : "Permission proof dry run",
);

for (const configured of agents) {
  const name = normalize(configured.name);
  const account = privateKeyToAccount(configured.privateKey);
  if (getAddress(configured.wallet) !== getAddress(account.address)) {
    throw new Error(`${name} private key does not match its configured wallet`);
  }
  const resolver = await publicClient.getEnsResolver({ name });
  if (!resolver) throw new Error(`${name} has no resolver`);
  const encodedName = toHex(packetToBytes(name));
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  const profileSimulation = await publicClient.simulateContract({
    account,
    address: resolver,
    abi: permissionedResolverAbi,
    functionName: "setText",
    args: [encodedName, "latch.profile", `LATCH agent profile for ${name}`],
  });

  let roleDenied = false;
  try {
    await publicClient.simulateContract({
      account,
      address: resolver,
      abi: permissionedResolverAbi,
      functionName: "setText",
      args: [encodedName, "latch.role", "admin"],
    });
  } catch {
    roleDenied = true;
  }
  if (!roleDenied) {
    throw new Error(`${name} unexpectedly has permission to modify latch.role`);
  }

  let profileTransaction = "not sent";
  if (execute) {
    const hash = await walletClient.writeContract(profileSimulation.request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success")
      throw new Error(`Transaction ${hash} failed`);
    profileTransaction = hash;
  }

  console.table({
    name,
    agentWallet: account.address,
    resolver,
    profileWrite: execute ? "confirmed" : "simulation succeeded",
    profileTransaction,
    protectedRoleWrite: "simulation reverted as required",
  });
}

if (!execute) {
  console.log(
    "Run npm run ens:verify-permissions -- --execute to persist harmless profile updates.",
  );
}
