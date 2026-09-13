import { BadRequestException, Injectable } from "@nestjs/common";
import { PlannedActionSchema, type PlannedAction } from "@latch/shared";
import { inferExplicitCapability, readQuantity } from "./prompt-intent.js";
import type { TaskPlanner } from "./task-planner.interface.js";

@Injectable()
export class LocalTaskPlanner implements TaskPlanner {
  async plan(prompt: string): Promise<PlannedAction> {
    const normalized = prompt.trim();
    const quantity = readQuantity(normalized);
    const explicitCapability = inferExplicitCapability(normalized);
    if (explicitCapability === "research.search") {
      return PlannedActionSchema.parse({
        capability: "research.search",
        query: normalized,
        maxResults: 5,
      });
    }
    if (explicitCapability === "procurement.purchase") {
      return PlannedActionSchema.parse({
        capability: "procurement.purchase",
        productQuery: normalized,
        quantity,
      });
    }
    {
      throw new BadRequestException(
        "The local planner could not map this request to a capability",
      );
    }
  }
}
