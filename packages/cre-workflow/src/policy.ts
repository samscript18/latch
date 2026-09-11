import { z } from "zod";

export const PublicPolicyInputSchema = z
  .object({
    taskId: z.string().trim().min(1).max(128),
    agent: z.string().trim().min(3).max(255).toLowerCase(),
    capability: z.literal("procurement.purchase"),
    vendor: z.string().trim().min(1).max(128),
    amountCents: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    policyVersion: z.string().trim().min(1).max(128),
  })
  .strict();

export const PrivatePolicySchema = z
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
  const policy = PrivatePolicySchema.parse(JSON.parse(privatePolicyJson));

  const approved =
    input.policyVersion === policy.policyVersion &&
    policy.allowedVendors.includes(input.vendor) &&
    input.amountCents <= policy.maxAutonomousSpendCents;

  return PublicPolicyResultSchema.parse({
    approved,
    policyVersion: input.policyVersion,
    reasonCode: approved ? "POLICY_ALLOWED" : "POLICY_DENIED",
  });
}
