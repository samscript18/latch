import { createHash, randomBytes } from "node:crypto";
import type { Address } from "viem";

interface SignInMessageInput {
  address: Address;
  nonce: string;
  issuedAt: Date;
  expiresAt: Date;
  chainId: number;
}

export function buildSignInMessage(input: SignInMessageInput): string {
  return [
    "LATCH requests authentication with your Ethereum account:",
    input.address,
    "",
    "Sign in to administer your organization's AI agents.",
    "",
    `URI: latch://wallet-auth`,
    `Version: 1`,
    `Chain ID: ${input.chainId}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt.toISOString()}`,
    `Expiration Time: ${input.expiresAt.toISOString()}`,
  ].join("\n");
}

export function createOpaqueSecret(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function readBearerToken(
  header: string | string[] | undefined,
): string | null {
  if (typeof header !== "string") return null;
  const match = /^Bearer ([A-Za-z0-9_-]+)$/.exec(header);
  return match?.[1] ?? null;
}
