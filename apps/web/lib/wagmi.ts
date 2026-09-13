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

const config = {
	chains: [hackathonSepolia],
	ssr: true,
	transports: {
		[hackathonSepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || undefined),
	},
} as const;

export const wagmiConfig = createConfig({
	...config,
	multiInjectedProviderDiscovery: true,
	connectors: [injected()],
});

declare module "wagmi" {
	interface Register {
		config: typeof wagmiConfig;
	}
}
