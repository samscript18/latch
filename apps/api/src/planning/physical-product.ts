export type PhysicalProductFamily =
  | "laptop"
  | "monitor"
  | "tablet"
  | "desktop"
  | "keyboard"
  | "mouse"
  | "headset"
  | "printer"
  | "phone"
  | "equipment"
  | "device";

const physicalProductPatterns: ReadonlyArray<
  readonly [PhysicalProductFamily, RegExp]
> = [
  ["laptop", /\b(?:laptops?|notebooks?)\b/],
  ["monitor", /\b(?:monitors?|displays?|screens?)\b/],
  ["tablet", /\b(?:tablets?|ipads?|galaxy\s+tabs?|surface\s+pros?)\b/],
  ["desktop", /\b(?:desktops?|computers?|workstations?)\b/],
  ["keyboard", /\bkeyboards?\b/],
  ["mouse", /\b(?:mouse|mice)\b/],
  ["headset", /\b(?:headsets?|headphones?)\b/],
  ["printer", /\bprinters?\b/],
  ["phone", /\b(?:phones?|smartphones?)\b/],
  ["equipment", /\bequipment\b/],
  ["device", /\bdevices?\b/],
];

export function normalizeIntentText(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

export function detectPhysicalProductFamily(
  value: string,
): PhysicalProductFamily | null {
  const normalized = normalizeIntentText(value);
  return (
    physicalProductPatterns.find(([, pattern]) =>
      pattern.test(normalized),
    )?.[0] ?? null
  );
}
