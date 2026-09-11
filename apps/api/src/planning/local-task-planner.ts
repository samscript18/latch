import { BadRequestException, Injectable } from "@nestjs/common";
import { PlannedActionSchema, type PlannedAction } from "@latch/shared";
import type { TaskPlanner } from "./task-planner.interface.js";

@Injectable()
export class LocalTaskPlanner implements TaskPlanner {
  async plan(prompt: string): Promise<PlannedAction> {
    const normalized = prompt.trim();
    const quantity = Number(/\b(\d+)\b/.exec(normalized)?.[1] ?? 1);
    let capability: PlannedAction["capability"];
    if (/\b(flights?|hotels?|travel|book a trip)\b/i.test(normalized))
      capability = "travel.booking";
    else if (/\b(buy|purchase|procure|order|monitor)\b/i.test(normalized)) {
      capability = "procurement.purchase";
    } else {
      throw new BadRequestException(
        "The local planner could not map this request to a capability",
      );
    }
    return PlannedActionSchema.parse({
      capability,
      productQuery: normalized,
      quantity,
    });
  }
}
