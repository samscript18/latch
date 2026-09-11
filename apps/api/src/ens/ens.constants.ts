import { getAddress, type Address, type Chain } from "viem";
import { sepolia } from "viem/chains";

export const ENS_V2_CLIENT = Symbol("ENS_V2_CLIENT");

export function createEnsV2HackathonChain(
  universalResolverAddress: Address | string,
): Chain {
  return {
    ...sepolia,
    contracts: {
      ...sepolia.contracts,
      ensUniversalResolver: {
        address: getAddress(universalResolverAddress),
      },
    },
  };
}

export const latchTextKeys = {
  role: "latch.role",
  status: "latch.status",
  capabilities: "latch.capabilities",
  organization: "latch.organization",
  policyVersion: "latch.policyVersion",
} as const;

export const SAFE_AGENT_TEXT_KEY = "latch.profile" as const;

// Verified against PermissionedResolverLib.sol in ensdomains/contracts-v2.
export const ROLE_SET_ADDR = 1n;
export const ROLE_SET_TEXT = 1n << 4n;
export const ROLE_SET_ADDR_ADMIN = ROLE_SET_ADDR << 128n;
export const ROLE_SET_TEXT_ADMIN = ROLE_SET_TEXT << 128n;
