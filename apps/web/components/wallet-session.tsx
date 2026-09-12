"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAccount, useDisconnect, useSignMessage, useSwitchChain } from "wagmi";
import { api, ApiError } from "../lib/api";
import { hackathonSepolia } from "../lib/wagmi";

export interface OrganizationProfile {
	id: string;
	name: string;
	ensName: string;
	ownerWallet: string;
	website: string;
	industry: string;
  onboardingStatus: "incomplete" | "complete";
  policy: {
    provider: "manual" | "chainlink";
    procurement: {
      status: string;
      policyVersion?: string;
      maxAutonomousSpendCents?: number;
      allowedVendors?: string[];
    };
    research: {
      status: string;
      policyVersion?: string;
      allowedDomains?: string[];
      blockedDomains?: string[];
      maxResults?: number;
    };
  };
	metrics: {
		agentCount: number;
		activeTasks: number;
		authorizedActions: number;
		blockedActions: number;
	};
	recentActivity: Array<{
		_id: string;
		message: string;
		result: string;
		createdAt: string;
	}>;
	agents: Array<{
		id: string;
		displayName: string;
		ensName: string;
		wallet: string;
		type?: "procurement" | "research";
		role?: "procurement" | "research";
		capability?: "procurement.purchase" | "research.search";
		policyVersion?: string;
		provisioningStatus?: "pending_ens" | "verified";
	}>;
}

interface MeResponse {
	exists: boolean;
	complete: boolean;
	organization: OrganizationProfile | null;
}

interface WalletSessionValue {
	address?: `0x${string}`;
	connected: boolean;
	authenticating: boolean;
	token: string | null;
	profile: MeResponse | undefined;
	profileLoading: boolean;
	error: string | null;
	authenticateConnectedWallet(): Promise<void>;
	disconnectWallet(): void;
	refreshProfile(): Promise<void>;
}

const WalletSessionContext = createContext<WalletSessionValue | null>(null);
const storageKey = "latch.wallet.session";

export function WalletSessionProvider({ children }: { children: ReactNode }) {
	const account = useAccount();
	const { disconnect } = useDisconnect();
	const { signMessageAsync } = useSignMessage();
	const { switchChainAsync } = useSwitchChain();
	const queryClient = useQueryClient();
	const [token, setToken] = useState<string | null>(null);
	const [authenticating, setAuthenticating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const saved = window.localStorage.getItem(storageKey);
		if (!account.address) return;
		if (!saved) {
			setToken(null);
			return;
		}
		try {
			const parsed = JSON.parse(saved) as { address: string; token: string };
			if (parsed.address.toLowerCase() === account.address.toLowerCase()) {
				setToken(parsed.token);
			} else {
				setToken(null);
			}
		} catch {
			window.localStorage.removeItem(storageKey);
		}
	}, [account.address]);

	const me = useQuery({
		queryKey: ["organization-me", account.address, token],
		queryFn: () =>
			api<MeResponse>("/organization/me", {
				headers: { authorization: `Bearer ${token}` },
			}),
		enabled: Boolean(account.address && token),
		retry: false,
	});

	useEffect(() => {
		if (me.error instanceof ApiError && me.error.status === 401) {
			setToken(null);
			window.localStorage.removeItem(storageKey);
		}
	}, [me.error]);

	const authenticate = useCallback(
		async (address: `0x${string}`) => {
			const challenge = await api<{ nonce: string; message: string }>("/auth/nonce", { method: "POST", body: JSON.stringify({ address }) });
			const signature = await signMessageAsync({ message: challenge.message });
			const session = await api<{ token: string }>("/auth/verify", {
				method: "POST",
				body: JSON.stringify({ address, nonce: challenge.nonce, signature }),
			});
			window.localStorage.setItem(storageKey, JSON.stringify({ address, token: session.token }));
			setToken(session.token);
		},
		[signMessageAsync],
	);

	const authenticateConnectedWallet = useCallback(async () => {
		setAuthenticating(true);
		setError(null);
		try {
			const address = account.address;
			if (!address) throw new Error("Connect a wallet first");
			if (account.chainId !== hackathonSepolia.id) {
				await switchChainAsync({ chainId: hackathonSepolia.id });
			}
			await authenticate(address);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Wallet sign-in failed");
		} finally {
			setAuthenticating(false);
		}
	}, [account.address, account.chainId, authenticate, switchChainAsync]);

	const disconnectWallet = useCallback(() => {
		setToken(null);
		setError(null);
		window.localStorage.removeItem(storageKey);
		queryClient.removeQueries({ queryKey: ["organization-me"] });
		disconnect();
	}, [disconnect, queryClient]);

	const value = useMemo<WalletSessionValue>(
		() => ({
			address: account.address,
			connected: account.isConnected,
			authenticating,
			token,
			profile: me.data,
			profileLoading: me.isLoading,
			error: error ?? (me.error instanceof Error ? me.error.message : null),
			authenticateConnectedWallet,
			disconnectWallet,
			refreshProfile: async () => {
				await me.refetch();
			},
		}),
		[account.address, account.isConnected, authenticateConnectedWallet, authenticating, disconnectWallet, error, me, token],
	);

	return <WalletSessionContext.Provider value={value}>{children}</WalletSessionContext.Provider>;
}

export function useWalletSession() {
	const value = useContext(WalletSessionContext);
	if (!value) throw new Error("WalletSessionProvider is missing");
	return value;
}
