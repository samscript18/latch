import { createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected } from "@wagmi/connectors/injected";
import { ENSV2_HACKATHON_UNIVERSAL_RESOLVER_ADDRESS } from "@latch/shared";

// viem's built-in Sepolia resolver points at a different ENS deployment.
export const hackathonSepolia = {
  ...sepolia,
  contracts: {
    ...sepolia.contracts,
    ensUniversalResolver: {
      address: ENSV2_HACKATHON_UNIVERSAL_RESOLVER_ADDRESS,
    },
  },
} as const;

export const wagmiConfig = createConfig({
  chains: [hackathonSepolia],
  connectors: [injected()],
  ssr: true,
  transports: {
    [hackathonSepolia.id]: http(
      process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || undefined,
    ),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
