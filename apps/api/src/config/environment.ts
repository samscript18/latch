import { z } from "zod";
import { ENSV2_HACKATHON_UNIVERSAL_RESOLVER_ADDRESS } from "@latch/shared";

const emptyStringToUndefined = (value: unknown): unknown =>
  value === "" ? undefined : value;

const optionalUrl = z.preprocess(emptyStringToUndefined, z.url().optional());
const optionalAddress = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
);

export const EnvironmentSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().max(65_535).default(4000),
    WEB_ORIGIN: z.url().default("http://localhost:3000"),
    MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/latch"),
    AUTH_CHALLENGE_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(60)
      .max(600)
      .default(300),
    AUTH_SESSION_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(300)
      .max(86_400)
      .default(900),
    DEMO_MODE: z.stringbool().default(true),
    HACKATHON_MODE: z.stringbool().default(false),
    SEPOLIA_RPC_URL: optionalUrl,
    SEPOLIA_CHAIN_ID: z.coerce.number().int().default(11_155_111),
    ENSV2_UNIVERSAL_RESOLVER_ADDRESS: optionalAddress.default(
      ENSV2_HACKATHON_UNIVERSAL_RESOLVER_ADDRESS,
    ),
    DEMO_ORG_NAME: z.string().min(1).default("Acme"),
    DEMO_ORG_ENS: z.string().optional(),
    DEMO_PROCUREMENT_AGENT_ENS: z.string().optional(),
    DEMO_TRAVEL_AGENT_ENS: z.string().optional(),
    DEMO_PROCUREMENT_AGENT_WALLET: optionalAddress,
    DEMO_TRAVEL_AGENT_WALLET: optionalAddress,
    ADMIN_WALLET_ADDRESS: optionalAddress,
    SEPOLIA_DEPLOYER_PRIVATE_KEY: z.preprocess(
      emptyStringToUndefined,
      z
        .string()
        .regex(/^0x[a-fA-F0-9]{64}$/)
        .optional(),
    ),
    PLANNER_PROVIDER: z.enum(["local", "gemini"]).default("local"),
    GOOGLE_CLOUD_API_KEY: z.preprocess(
      emptyStringToUndefined,
      z.string().min(1).optional(),
    ),
    GEMINI_MODEL: z.preprocess(
      emptyStringToUndefined,
      z.string().min(1).optional(),
    ),
    POLICY_PROVIDER: z.enum(["local", "chainlink"]).default("local"),
    CAPABILITY_PROVIDER: z.enum(["local", "recipe"]).default("local"),
    CRE_ENVIRONMENT: z.string().optional(),
    CRE_POLICY_SECRET_REFERENCE: z.string().optional(),
    CRE_WORKFLOW_URL: optionalUrl,
    BAZANTIC_GATEWAY_URL: optionalUrl,
    BAZANTIC_RECIPE_ID: z.string().optional(),
    BAZANTIC_API_KEY: z.string().optional(),
    AUDIT_CONTRACT_ADDRESS: optionalAddress,
  })
  .superRefine((environment, context) => {
    if (
      environment.HACKATHON_MODE &&
      environment.POLICY_PROVIDER !== "chainlink"
    ) {
      context.addIssue({
        code: "custom",
        message: "HACKATHON_MODE requires POLICY_PROVIDER=chainlink",
        path: ["POLICY_PROVIDER"],
      });
    }
    if (
      environment.HACKATHON_MODE &&
      environment.POLICY_PROVIDER === "chainlink" &&
      !environment.CRE_WORKFLOW_URL
    ) {
      context.addIssue({
        code: "custom",
        message: "HACKATHON_MODE requires CRE_WORKFLOW_URL",
        path: ["CRE_WORKFLOW_URL"],
      });
    }
    if (
      environment.HACKATHON_MODE &&
      environment.PLANNER_PROVIDER !== "gemini"
    ) {
      context.addIssue({
        code: "custom",
        message: "HACKATHON_MODE requires PLANNER_PROVIDER=gemini",
        path: ["PLANNER_PROVIDER"],
      });
    }
    if (
      environment.PLANNER_PROVIDER === "gemini" &&
      !environment.GOOGLE_CLOUD_API_KEY
    ) {
      context.addIssue({
        code: "custom",
        message: "PLANNER_PROVIDER=gemini requires GOOGLE_CLOUD_API_KEY",
        path: ["GOOGLE_CLOUD_API_KEY"],
      });
    }
    if (
      environment.HACKATHON_MODE &&
      environment.CAPABILITY_PROVIDER !== "recipe"
    ) {
      context.addIssue({
        code: "custom",
        message: "HACKATHON_MODE requires CAPABILITY_PROVIDER=recipe",
        path: ["CAPABILITY_PROVIDER"],
      });
    }
    if (
      environment.HACKATHON_MODE &&
      environment.CAPABILITY_PROVIDER === "recipe" &&
      (!environment.BAZANTIC_GATEWAY_URL ||
        !environment.BAZANTIC_RECIPE_ID ||
        !environment.BAZANTIC_API_KEY)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "HACKATHON_MODE requires complete Bazantic Recipe configuration",
        path: ["BAZANTIC_GATEWAY_URL"],
      });
    }
    if (environment.HACKATHON_MODE && !environment.AUDIT_CONTRACT_ADDRESS) {
      context.addIssue({
        code: "custom",
        message: "HACKATHON_MODE requires AUDIT_CONTRACT_ADDRESS",
        path: ["AUDIT_CONTRACT_ADDRESS"],
      });
    }
    if (environment.SEPOLIA_CHAIN_ID !== 11_155_111) {
      context.addIssue({
        code: "custom",
        message:
          "LATCH chain integrations must target Sepolia (chain ID 11155111)",
        path: ["SEPOLIA_CHAIN_ID"],
      });
    }
  });

export type Environment = z.infer<typeof EnvironmentSchema>;

export function validateEnvironment(raw: Record<string, unknown>): Environment {
  const result = EnvironmentSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid environment configuration: ${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}
