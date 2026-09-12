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
  productUrl: "https://www.dell.com/en-us/shop/computer-monitors/ar/4009",
};

const premiumMonitor: ProductCandidate = {
  id: "fixture-monitor-premium",
  name: "Premium Professional Monitor",
  vendor: "demo-vendor-a",
  unitPriceCents: 23_500,
  currency: "USD",
  source: "local-fixture",
  productUrl: "https://www.dell.com/en-us/shop/computer-monitors/ar/4009",
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
