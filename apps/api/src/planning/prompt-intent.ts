import { PlannedActionSchema, type PlannedAction } from "@latch/shared";

const directProcurementIntent =
  /\b(buy|purchase|purchasing|procure|procuring|order|ordering|shop\s+for|source|sourcing)\b/i;
const researchIntent =
  /\b(research|investigate|find\s+(?:reliable\s+)?sources?|search\s+(?:the\s+)?web|study|literature|papers?|articles?|reports?|information\s+(?:about|on))\b/i;
const physicalProductIntent =
  /\b(monitors?|tablets?|ipads?|laptops?|computers?|keyboards?|mice|desks?|chairs?|headsets?|phones?|printers?|equipment|supplies)\b/i;
const findIntent = /\b(find|locate|select|recommend)\b/i;

export function reconcilePlannedAction(
  prompt: string,
  planned: PlannedAction,
): PlannedAction {
  const capability = inferExplicitCapability(prompt);
  if (!capability || capability === planned.capability) return planned;

  if (capability === "procurement.purchase") {
    return PlannedActionSchema.parse({
      capability,
      productQuery: prompt.trim(),
      quantity: readQuantity(prompt),
    });
  }

  return PlannedActionSchema.parse({
    capability,
    query: prompt.trim(),
    domains: [],
    maxResults: 5,
  });
}

export function inferExplicitCapability(
  prompt: string,
): PlannedAction["capability"] | null {
  if (directProcurementIntent.test(prompt)) return "procurement.purchase";
  if (researchIntent.test(prompt)) return "research.search";
  if (findIntent.test(prompt) && physicalProductIntent.test(prompt)) {
    return "procurement.purchase";
  }
  return null;
}

function readQuantity(prompt: string) {
  const parsed = Number(/\b(\d+)\b/.exec(prompt)?.[1] ?? 1);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}
