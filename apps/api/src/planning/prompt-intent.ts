import { PlannedActionSchema, type PlannedAction } from "@latch/shared";
import {
  detectPhysicalProductFamily,
  normalizeIntentText,
} from "./physical-product.js";

const directProcurementIntent =
  /\b(?:buy|buying|purchase|purchasing|procure|procuring|order|ordering|shop\s+for)\b/;
const researchIntent =
  /\b(?:research|investigate|search\s+(?:the\s+)?web|study|literature|papers?|articles?|reports?|facts?|information\s+(?:about|on)|standards?|find\s+(?:reliable\s+)?sources?|sources?\s+(?:about|on))\b/;
const sourcingIntent =
  /\b(?:find|locate|select|recommend|compare|source|sourcing)\b/;

export function reconcilePlannedAction(
  prompt: string,
  rawPlan: unknown,
): PlannedAction {
  const capability = inferExplicitCapability(prompt);
  const parsedPlan = PlannedActionSchema.safeParse(rawPlan);

  if (!capability) return PlannedActionSchema.parse(rawPlan);

  if (parsedPlan.success && capability === parsedPlan.data.capability) {
    if (parsedPlan.data.capability === "procurement.purchase") {
      return PlannedActionSchema.parse({
        ...parsedPlan.data,
        quantity:
          readExplicitQuantity(prompt) ?? parsedPlan.data.quantity,
      });
    }
    return PlannedActionSchema.parse(parsedPlan.data);
  }

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
  const normalized = normalizeIntentText(prompt);

  // Information artifacts keep requests such as "find articles about laptops"
  // in research even though their subject mentions a physical product.
  if (researchIntent.test(normalized)) return "research.search";

  const productFamily = detectPhysicalProductFamily(normalized);
  if (
    productFamily &&
    (directProcurementIntent.test(normalized) ||
      sourcingIntent.test(normalized))
  ) {
    return "procurement.purchase";
  }
  return null;
}

export function readQuantity(prompt: string) {
  return readExplicitQuantity(prompt) ?? 1;
}

function readExplicitQuantity(prompt: string) {
  const normalized = normalizeIntentText(prompt);
  const match = /\b(\d+)\b/.exec(normalized);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}
