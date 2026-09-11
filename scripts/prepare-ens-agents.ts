import { ConfigService } from "@nestjs/config";
import { createPublicClient, getAddress, http, type Address } from "viem";
import {
  validateEnvironment,
  type Environment,
} from "../apps/api/src/config/environment.js";
import { EnsAdminService } from "../apps/api/src/ens/ens-admin.service.js";
import { EnsRecordParser } from "../apps/api/src/ens/ens-record.parser.js";
import { EnsService } from "../apps/api/src/ens/ens.service.js";
import { EnsTransactionGateway } from "../apps/api/src/ens/ens-transaction.gateway.js";
import { createEnsV2HackathonChain } from "../apps/api/src/ens/ens.constants.js";

function required(value: string | undefined, variable: string): string {
  if (!value) throw new Error(`${variable} must be configured in .env`);
  return value;
}

function requiredAddress(value: string | undefined, variable: string): Address {
  return getAddress(required(value, variable));
}

const environment = validateEnvironment(process.env);
const config = new ConfigService(environment) as ConfigService<
  Environment,
  true
>;
const rpcUrl = required(environment.SEPOLIA_RPC_URL, "SEPOLIA_RPC_URL");
const client = createPublicClient({
  chain: createEnsV2HackathonChain(
    environment.ENSV2_UNIVERSAL_RESOLVER_ADDRESS,
  ),
  transport: http(rpcUrl),
});
const ens = new EnsService(client, config, new EnsRecordParser());
const admin = new EnsAdminService(ens, new EnsTransactionGateway(config));
const execute = process.argv.includes("--execute");

const organization = required(environment.DEMO_ORG_ENS, "DEMO_ORG_ENS");
const agents = [
  {
    displayName: "Procurement Agent",
    name: required(
      environment.DEMO_PROCUREMENT_AGENT_ENS,
      "DEMO_PROCUREMENT_AGENT_ENS",
    ),
    wallet: requiredAddress(
      environment.DEMO_PROCUREMENT_AGENT_WALLET,
      "DEMO_PROCUREMENT_AGENT_WALLET",
    ),
    role: "procurement" as const,
    capability: "procurement.purchase" as const,
    policyVersion: "procurement-v1",
  },
  {
    displayName: "Travel Agent",
    name: required(environment.DEMO_TRAVEL_AGENT_ENS, "DEMO_TRAVEL_AGENT_ENS"),
    wallet: requiredAddress(
      environment.DEMO_TRAVEL_AGENT_WALLET,
      "DEMO_TRAVEL_AGENT_WALLET",
    ),
    role: "travel" as const,
    capability: "travel.booking" as const,
    policyVersion: "travel-v1",
  },
];

console.log(
  execute
    ? "ENSv2 execution mode"
    : "ENSv2 dry run (append -- --execute to write)",
);
console.log(`Organization namespace: ${organization}`);

for (const agent of agents) {
  const current = await ens.resolveAgent(agent.name);
  if (!current.resolver) {
    throw new Error(
      `${agent.name} has no active resolver. Create the ENSv2 child and assign an Owned/Permissioned Resolver before running this script.`,
    );
  }

  if (!execute) {
    console.table({
      agent: agent.displayName,
      name: agent.name,
      resolver: current.resolver,
      currentWallet: current.wallet ?? "unresolved",
      plannedWallet: agent.wallet,
      plannedRole: agent.role,
      plannedCapability: agent.capability,
      plannedPolicyVersion: agent.policyVersion,
    });
    continue;
  }

  const records = await admin.setProtectedAgentRecords(agent.name, {
    agentWallet: agent.wallet,
    role: agent.role,
    status: "active",
    capabilities: [agent.capability],
    organization,
    policyVersion: agent.policyVersion,
  });
  const permission = await admin.grantSafeRecordPermission(
    agent.name,
    agent.wallet,
  );
  console.table({
    agent: agent.displayName,
    name: permission.identity.name,
    wallet: permission.identity.wallet,
    role: permission.identity.role,
    status: permission.identity.status,
    capabilities: permission.identity.capabilities.join(","),
    resolver: permission.identity.resolver,
    recordsTransaction: records.transactionHash,
    profilePermissionTransaction: permission.transactionHash,
    verifiedAtBlock: permission.identity.checkedAtBlock?.toString(),
  });
}
