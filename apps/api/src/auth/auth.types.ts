import type { Address } from "viem";

export interface AuthenticatedWallet {
  address: Address;
  sessionExpiresAt: Date;
}

export interface WalletAuthenticatedRequest {
  headers: { authorization?: string | string[] };
  walletSession?: AuthenticatedWallet;
}
