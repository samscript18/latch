import { ENSV2_HACKATHON_UNIVERSAL_RESOLVER_ADDRESS } from "@latch/shared";
import {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  parseEther,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createEnsV2HackathonChain } from "../apps/api/src/ens/ens.constants.js";

function required(value: string | undefined, variable: string): string {
  if (!value) throw new Error(`${variable} must be configured in .env`);
  return value;
}

const rpcUrl = required(process.env.SEPOLIA_RPC_URL, "SEPOLIA_RPC_URL");
const account = privateKeyToAccount(
  required(
    process.env.SEPOLIA_DEPLOYER_PRIVATE_KEY,
    "SEPOLIA_DEPLOYER_PRIVATE_KEY",
  ) as Hex,
);
if (
  process.env.ADMIN_WALLET_ADDRESS &&
  getAddress(process.env.ADMIN_WALLET_ADDRESS) !== getAddress(account.address)
) {
  throw new Error("SEPOLIA_DEPLOYER_PRIVATE_KEY does not match admin wallet");
}

const recipients: Address[] = [
  getAddress(
    required(
      process.env.DEMO_PROCUREMENT_AGENT_WALLET,
      "DEMO_PROCUREMENT_AGENT_WALLET",
    ),
  ),
  getAddress(
    required(process.env.DEMO_RESEARCH_AGENT_WALLET, "DEMO_RESEARCH_AGENT_WALLET"),
  ),
];
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
const targetBalance = parseEther("0.001");

for (const recipient of recipients) {
  let balance = await publicClient.getBalance({ address: recipient });
  let transaction = "none";
  if (balance < targetBalance) {
    const hash = await walletClient.sendTransaction({
      to: recipient,
      value: targetBalance - balance,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success")
      throw new Error(`Transaction ${hash} failed`);
    transaction = hash;
    balance = await publicClient.getBalance({ address: recipient });
  }
  console.table({ recipient, balanceWei: balance.toString(), transaction });
}
