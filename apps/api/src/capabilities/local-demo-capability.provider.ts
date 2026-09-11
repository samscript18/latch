import { Injectable } from "@nestjs/common";
import type {
  CapabilityProvider,
  ExecutionResult,
  ProductCandidate,
  PurchaseInput,
} from "./capability-provider.interface.js";

const standardMonitor: ProductCandidate = {
  id: "fixture-monitor-standard",
  name: "Standard Office Monitor",
  vendor: "demo-vendor-a",
  unitPriceCents: 6_200,
  currency: "USD",
  source: "local-fixture",
};

const premiumMonitor: ProductCandidate = {
  id: "fixture-monitor-premium",
  name: "Premium Professional Monitor",
  vendor: "demo-vendor-a",
  unitPriceCents: 23_500,
  currency: "USD",
  source: "local-fixture",
};

@Injectable()
export class LocalDemoCapabilityProvider implements CapabilityProvider {
  async searchProducts(query: string): Promise<ProductCandidate[]> {
    const products = [standardMonitor, premiumMonitor];
    return /premium|professional/i.test(query) ? products.reverse() : products;
  }

  async executePurchase(input: PurchaseInput): Promise<ExecutionResult> {
    return {
      executionReference: `local-demo:${input.authorizationId}`,
      provider: "local-demo",
    };
  }
}
