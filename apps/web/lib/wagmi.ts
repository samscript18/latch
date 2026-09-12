import { createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected } from "@wagmi/connectors/injected";
import { walletConnect } from "@wagmi/connectors/walletConnect";
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

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();

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
	connectors: [injected(), ...(projectId ? [walletConnect({ projectId, showQrModal: true, metadata: { name: "LATCH", description: "Verifiable authority for autonomous AI workers", url: "https://latch-sec.vercel.app", icons: [] } })] : [])],
});

declare module "wagmi" {
	interface Register {
		config: typeof wagmiConfig;
	}
}
