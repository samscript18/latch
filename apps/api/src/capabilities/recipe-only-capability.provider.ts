import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type {
  CapabilityProvider,
  ExecutionResult,
  ProductCandidate,
} from "./capability-provider.interface.js";

@Injectable()
export class RecipeOnlyCapabilityProvider implements CapabilityProvider {
  searchProducts(): Promise<ProductCandidate[]> {
    throw new ServiceUnavailableException(
      "Product search must be orchestrated by the Bazantic Recipe",
    );
  }

  executePurchase(): Promise<ExecutionResult> {
    throw new ServiceUnavailableException(
      "Execution must be orchestrated by the Bazantic Recipe",
    );
  }
}
