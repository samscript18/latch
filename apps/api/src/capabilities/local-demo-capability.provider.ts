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

const standardTablet: ProductCandidate = {
  id: "fixture-tablet-standard",
  name: "Standard Office Tablet",
  vendor: "demo-vendor-a",
  unitPriceCents: 18_900,
  currency: "USD",
  source: "local-fixture",
  productUrl: "https://www.samsung.com/us/tablets/",
};

const premiumTablet: ProductCandidate = {
  id: "fixture-tablet-premium",
  name: "Premium Professional Tablet",
  vendor: "demo-vendor-a",
  unitPriceCents: 47_000,
  currency: "USD",
  source: "local-fixture",
  productUrl: "https://www.samsung.com/us/tablets/",
};

@Injectable()
export class LocalDemoCapabilityProvider implements CapabilityProvider {
  async searchProducts(query: string): Promise<ProductCandidate[]> {
    const products = /\b(tablet|ipad|galaxy\s+tab|surface\s+pro)s?\b/i.test(query)
      ? [standardTablet, premiumTablet]
      : /\b(monitors?|displays?|screens?)\b/i.test(query)
        ? [standardMonitor, premiumMonitor]
        : [];
    return /\b(premium|professional)\b/i.test(query)
      ? [...products].reverse()
      : products;
  }

  async executePurchase(input: PurchaseInput): Promise<ExecutionResult> {
    return {
      executionReference: `local-demo:${input.authorizationId}`,
      provider: "local-demo",
    };
  }
}
