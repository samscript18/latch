import { BadRequestException, Injectable } from "@nestjs/common";
import { PlannedActionSchema, type PlannedAction } from "@latch/shared";
import type { TaskPlanner } from "./task-planner.interface.js";

@Injectable()
export class LocalTaskPlanner implements TaskPlanner {
  async plan(prompt: string): Promise<PlannedAction> {
    const normalized = prompt.trim();
    const quantity = Number(/\b(\d+)\b/.exec(normalized)?.[1] ?? 1);
    if (/\b(research|investigate|find sources?|search the web|study)\b/i.test(normalized)) {
      return PlannedActionSchema.parse({
        capability: "research.search",
        query: normalized,
        maxResults: 5,
      });
    }
    if (/\b(buy|purchase|procure|order|monitor)\b/i.test(normalized)) {
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
