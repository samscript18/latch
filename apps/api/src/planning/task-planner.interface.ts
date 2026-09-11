import type { PlannedAction } from "@latch/shared";

export const TASK_PLANNER = Symbol("TASK_PLANNER");

export interface TaskPlanner {
  plan(prompt: string): Promise<PlannedAction>;
}
