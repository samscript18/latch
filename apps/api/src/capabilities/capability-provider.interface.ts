import type { Capability } from "@latch/shared";

export interface ProductCandidate {
  id: string;
  name: string;
  vendor: string;
  unitPriceCents: number;
  currency: "USD";
  source: "local-fixture" | "bazantic";
  productUrl?: string;
}

export interface PurchaseInput {
  taskId: string;
  authorizationId: string;
  capability: Capability;
  product: ProductCandidate;
  quantity: number;
  totalAmountCents: number;
}

export interface ExecutionResult {
  executionReference: string;
  transactionHash?: `0x${string}`;
  provider: "local-demo" | "bazantic";
}

export const CAPABILITY_PROVIDER = Symbol("CAPABILITY_PROVIDER");

export interface CapabilityProvider {
  searchProducts(query: string): Promise<ProductCandidate[]>;
  executePurchase(input: PurchaseInput): Promise<ExecutionResult>;
}
