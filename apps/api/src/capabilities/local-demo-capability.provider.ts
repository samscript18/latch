import { Injectable } from "@nestjs/common";
import type {
  CapabilityProvider,
  ExecutionResult,
  ProductCandidate,
  PurchaseInput,
} from "./capability-provider.interface.js";
import {
  detectPhysicalProductFamily,
  type PhysicalProductFamily,
} from "../planning/physical-product.js";

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

const standardProducts: Partial<
  Record<PhysicalProductFamily, ProductCandidate>
> = {
  monitor: standardMonitor,
  tablet: standardTablet,
  laptop: {
    id: "fixture-laptop-standard",
    name: "Standard Office Laptop",
    vendor: "demo-vendor-a",
    unitPriceCents: 79_900,
    currency: "USD",
    source: "local-fixture",
    productUrl:
      "https://www.dell.com/en-us/shop/dell-laptops-and-2-in-1-pcs/scr/laptops",
  },
};

const premiumProducts: Partial<
  Record<PhysicalProductFamily, ProductCandidate>
> = {
  monitor: premiumMonitor,
  tablet: premiumTablet,
  laptop: {
    id: "fixture-laptop-premium",
    name: "Premium Professional Laptop",
    vendor: "demo-vendor-a",
    unitPriceCents: 149_900,
    currency: "USD",
    source: "local-fixture",
    productUrl:
      "https://www.dell.com/en-us/shop/dell-laptops-and-2-in-1-pcs/scr/laptops",
  },
};

@Injectable()
export class LocalDemoCapabilityProvider implements CapabilityProvider {
  async searchProducts(query: string): Promise<ProductCandidate[]> {
    const family = detectPhysicalProductFamily(query);
    const standard = family ? standardProducts[family] : undefined;
    const premium = family ? premiumProducts[family] : undefined;
    const products = standard && premium ? [standard, premium] : [];
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
