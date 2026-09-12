import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";
import type { Environment } from "../config/environment.js";
import { markIntegrationSuccess } from "../common/integration-telemetry.js";
import type {
  CapabilityProvider,
  ExecutionResult,
  ProductCandidate,
  PurchaseInput,
} from "./capability-provider.interface.js";

const productSchema = z
  .object({
    id: z.string().trim().min(1).max(256),
    name: z.string().trim().min(1).max(512),
    vendor: z.string().trim().min(1).max(128),
    unitPriceCents: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    currency: z.literal("USD"),
    productUrl: z
      .string()
      .url()
      .refine((value) => /^https?:\/\//i.test(value), "Product URL must use HTTP(S)")
      .optional(),
  })
  .strict();
const searchResponseSchema = z
  .object({ products: z.array(productSchema).max(100) })
  .strict();
const executionResponseSchema = z
  .object({
    executionReference: z.string().trim().min(1).max(512),
    transactionHash: z
      .string()
      .regex(/^0x[a-fA-F0-9]{64}$/)
      .optional(),
  })
  .strict();
const purchaseInputSchema = z
  .object({
    taskId: z.string().trim().min(1).max(128),
    authorizationId: z.string().trim().min(1).max(256),
    capability: z.literal("procurement.purchase"),
    product: productSchema.extend({ source: z.literal("bazantic") }),
    quantity: z.number().int().positive().max(10_000),
    totalAmountCents: z
      .number()
      .int()
      .nonnegative()
      .max(Number.MAX_SAFE_INTEGER),
  })
  .strict()
  .refine(
    (input) =>
      Number.isSafeInteger(input.product.unitPriceCents * input.quantity) &&
      input.totalAmountCents === input.product.unitPriceCents * input.quantity,
    { message: "Purchase total does not match provider price and quantity" },
  );

@Injectable()
export class BazanticCapabilityProvider implements CapabilityProvider {
  private readonly url: string;
  private readonly recipeId: string;
  private readonly apiKey: string;

  constructor(@Inject(ConfigService) config: ConfigService<Environment, true>) {
    this.url = config.get("BAZANTIC_GATEWAY_URL", { infer: true }) ?? "";
    this.recipeId = config.get("BAZANTIC_RECIPE_ID", { infer: true }) ?? "";
    this.apiKey = config.get("BAZANTIC_API_KEY", { infer: true }) ?? "";
  }

  async searchProducts(query: string): Promise<ProductCandidate[]> {
    const validatedQuery = z.string().trim().min(1).max(200).parse(query);
    const response = searchResponseSchema.parse(
      await this.call("search_products", { query: validatedQuery }),
    );
    markIntegrationSuccess("bazantic");
    return response.products.map((product) => ({
      ...product,
      source: "bazantic" as const,
    }));
  }

  async executePurchase(input: PurchaseInput): Promise<ExecutionResult> {
    const purchase = purchaseInputSchema.parse(input);
    const response = executionResponseSchema.parse(
      await this.call("execute_purchase", purchase),
    );
    markIntegrationSuccess("bazantic");
    return {
      executionReference: response.executionReference,
      transactionHash: response.transactionHash as `0x${string}` | undefined,
      provider: "bazantic",
    };
  }

  private async call(operation: string, input: unknown): Promise<unknown> {
    if (!this.url || !this.recipeId || !this.apiKey) {
      throw new ServiceUnavailableException(
        "Bazantic Gateway configuration is incomplete",
      );
    }
    try {
      const response = await fetch(this.url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ recipeId: this.recipeId, operation, input }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok)
        throw new Error(`Gateway returned HTTP ${response.status}`);
      return (await response.json()) as unknown;
    } catch {
      throw new ServiceUnavailableException(
        "Bazantic capability is unavailable",
      );
    }
  }
}
