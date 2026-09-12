"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSignMessage,
  useSwitchChain,
} from "wagmi";
import { api } from "../lib/api";
import { hackathonSepolia } from "../lib/wagmi";

export interface OrganizationProfile {
  id: string;
  name: string;
  ensName: string;
  ownerWallet: string;
  website: string;
  industry: string;
  onboardingStatus: "incomplete" | "complete";
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
    role?: "procurement" | "travel";
    capability?: "procurement.purchase" | "travel.booking";
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
  connectAndAuthenticate(): Promise<void>;
  disconnectWallet(): void;
  refreshProfile(): Promise<void>;
}

const WalletSessionContext = createContext<WalletSessionValue | null>(null);
const storageKey = "latch.wallet.session";

export function WalletSessionProvider({ children }: { children: ReactNode }) {
  const account = useAccount();
  const { connectors, connectAsync } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { switchChainAsync } = useSwitchChain();
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved || !account.address) return;
    try {
      const parsed = JSON.parse(saved) as { address: string; token: string };
      if (parsed.address.toLowerCase() === account.address.toLowerCase()) {
        setToken(parsed.token);
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
    if (me.error) {
      setToken(null);
      window.localStorage.removeItem(storageKey);
    }
  }, [me.error]);

  const authenticate = useCallback(
    async (address: `0x${string}`) => {
      const challenge = await api<{ nonce: string; message: string }>(
        "/auth/nonce",
        { method: "POST", body: JSON.stringify({ address }) },
      );
      const signature = await signMessageAsync({ message: challenge.message });
      const session = await api<{ token: string }>("/auth/verify", {
        method: "POST",
        body: JSON.stringify({ address, nonce: challenge.nonce, signature }),
      });
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ address, token: session.token }),
      );
      setToken(session.token);
    },
    [signMessageAsync],
  );

  const connectAndAuthenticate = useCallback(async () => {
    setAuthenticating(true);
    setError(null);
    try {
      let address = account.address;
      if (!address) {
        const connector =
          connectors.find((item) => item.type === "injected") ?? connectors[0];
        if (!connector) throw new Error("No browser wallet was detected");
        const result = await connectAsync({
          connector,
          chainId: hackathonSepolia.id,
        });
        address = result.accounts[0];
      }
      if (account.chainId !== hackathonSepolia.id) {
        await switchChainAsync({ chainId: hackathonSepolia.id });
      }
      await authenticate(address);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Wallet sign-in failed",
      );
    } finally {
      setAuthenticating(false);
    }
  }, [
    account.address,
    account.chainId,
    authenticate,
    connectAsync,
    connectors,
    switchChainAsync,
  ]);

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
      error,
      connectAndAuthenticate,
      disconnectWallet,
      refreshProfile: async () => {
        await me.refetch();
      },
    }),
    [
      account.address,
      account.isConnected,
      authenticating,
      connectAndAuthenticate,
      disconnectWallet,
      error,
      me,
      token,
    ],
  );

  return (
    <WalletSessionContext.Provider value={value}>
      {children}
    </WalletSessionContext.Provider>
  );
}

export function useWalletSession() {
  const value = useContext(WalletSessionContext);
  if (!value) throw new Error("WalletSessionProvider is missing");
  return value;
}
