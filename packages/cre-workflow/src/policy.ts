import { z } from "zod";

const PublicPolicyBaseSchema = z.object({
    taskId: z.string().trim().min(1).max(128),
    agent: z.string().trim().min(3).max(255).toLowerCase(),
    policyVersion: z.string().trim().min(1).max(128),
});

export const PublicPolicyInputSchema = z.discriminatedUnion("capability", [
  PublicPolicyBaseSchema.extend({
    capability: z.literal("procurement.purchase"),
    vendor: z.string().trim().min(1).max(128),
    amountCents: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  }).strict(),
  PublicPolicyBaseSchema.extend({
    capability: z.literal("research.search"),
    query: z.string().trim().min(1).max(500),
    domains: z.array(z.string().trim().min(1).max(253)).max(20),
    maxResults: z.number().int().min(1).max(20),
  }).strict(),
]);

export const ProcurementPrivatePolicySchema = z
  .object({
    policyVersion: z.string().trim().min(1).max(128),
    maxAutonomousSpendCents: z
      .number()
      .int()
      .nonnegative()
      .max(Number.MAX_SAFE_INTEGER),
    allowedVendors: z.array(z.string().trim().min(1).max(128)).min(1),
  })
  .strict();

export const ResearchPrivatePolicySchema = z
  .object({
    policyVersion: z.string().trim().min(1).max(128),
    allowedDomains: z.array(z.string().trim().min(1).max(253)).max(100),
    blockedDomains: z.array(z.string().trim().min(1).max(253)).max(100),
    maxResults: z.number().int().min(1).max(20),
  })
  .strict();

export const PublicPolicyResultSchema = z
  .object({
    approved: z.boolean(),
    policyVersion: z.string().trim().min(1).max(128),
    reasonCode: z.enum(["POLICY_ALLOWED", "POLICY_DENIED"]),
  })
  .strict();

export type PublicPolicyInput = z.infer<typeof PublicPolicyInputSchema>;
export type PublicPolicyResult = z.infer<typeof PublicPolicyResultSchema>;

/**
 * Runs only inside the TEE handler in the deployed workflow. The returned value
 * deliberately contains no threshold, allowlist, or detailed denial reason.
 */
export function evaluatePrivatePolicy(
  rawInput: unknown,
  privatePolicyJson: string,
): PublicPolicyResult {
  const input = PublicPolicyInputSchema.parse(rawInput);
  const rawPolicy: unknown = JSON.parse(privatePolicyJson);
  const approved = input.capability === "procurement.purchase"
    ? evaluateProcurement(input, ProcurementPrivatePolicySchema.parse(rawPolicy))
    : evaluateResearch(input, ResearchPrivatePolicySchema.parse(rawPolicy));

  return PublicPolicyResultSchema.parse({
    approved,
    policyVersion: input.policyVersion,
    reasonCode: approved ? "POLICY_ALLOWED" : "POLICY_DENIED",
  });
}

function evaluateProcurement(
  input: Extract<PublicPolicyInput, { capability: "procurement.purchase" }>,
  policy: z.infer<typeof ProcurementPrivatePolicySchema>,
): boolean {
  return input.policyVersion === policy.policyVersion &&
    policy.allowedVendors.includes(input.vendor) &&
    input.amountCents <= policy.maxAutonomousSpendCents;
}

function evaluateResearch(
  input: Extract<PublicPolicyInput, { capability: "research.search" }>,
  policy: z.infer<typeof ResearchPrivatePolicySchema>,
): boolean {
  return input.policyVersion === policy.policyVersion &&
    input.maxResults <= policy.maxResults &&
    input.domains.every((domain) =>
      !policy.blockedDomains.some((rule) => domainMatches(domain, rule)) &&
      (policy.allowedDomains.length === 0 ||
        policy.allowedDomains.some((rule) => domainMatches(domain, rule))),
    );
}

function domainMatches(domain: string, rule: string): boolean {
  const normalizedDomain = domain.toLowerCase().replace(/^www\./, "");
  const normalizedRule = rule.toLowerCase();
  return normalizedRule.startsWith("*.")
    ? normalizedDomain.endsWith(normalizedRule.slice(1))
    : normalizedDomain === normalizedRule;
}
