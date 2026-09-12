import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { BazanticRecipeGuard } from "./bazantic-recipe.guard.js";
import { BazanticRecipeService } from "./bazantic-recipe.service.js";

const proposalSchema = z
  .object({
    recipeInvocationId: z
      .string()
      .trim()
      .min(1)
      .max(128)
      .regex(/^[A-Za-z0-9._-]+$/),
    agentEnsName: z.string().trim().min(3).max(255),
    prompt: z.string().trim().min(1).max(2_000),
    capability: z.literal("procurement.purchase"),
    product: z
      .object({
        id: z.string().trim().min(1).max(256),
        name: z.string().trim().min(1).max(512),
        vendor: z.string().trim().min(1).max(128),
        unitPriceCents: z.number().int().nonnegative().max(100_000_000),
        currency: z.literal("USD"),
        productUrl: z
          .string()
          .url()
          .refine((value) => /^https?:\/\//i.test(value))
          .optional(),
      })
      .strict(),
    quantity: z.number().int().positive().max(10_000),
  })
  .strict()
  .refine(
    ({ product, quantity }) =>
      Number.isSafeInteger(product.unitPriceCents * quantity),
    { message: "Calculated total is outside the supported range" },
  );

const executionSchema = z
  .object({
    proposalDigest: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
    executionReference: z.string().trim().min(1).max(512),
    transactionHash: z
      .string()
      .regex(/^0x[a-fA-F0-9]{64}$/)
      .optional(),
  })
  .strict();

@Controller("bazantic/proposals")
@UseGuards(BazanticRecipeGuard)
@ApiTags("Bazantic Recipe")
@ApiBearerAuth()
export class BazanticRecipeController {
  constructor(
    @Inject(BazanticRecipeService)
    private readonly recipes: BazanticRecipeService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Persist a catalog-derived Recipe proposal" })
  @ApiBody({
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "recipeInvocationId",
        "agentEnsName",
        "prompt",
        "capability",
        "product",
        "quantity",
      ],
      properties: {
        recipeInvocationId: { type: "string" },
        agentEnsName: { type: "string" },
        prompt: { type: "string" },
        capability: { type: "string", enum: ["procurement.purchase"] },
        product: {
          type: "object",
          additionalProperties: false,
          required: ["id", "name", "vendor", "unitPriceCents", "currency"],
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            vendor: { type: "string" },
            unitPriceCents: { type: "integer", minimum: 0 },
            currency: { type: "string", enum: ["USD"] },
            productUrl: { type: "string", format: "uri" },
          },
        },
        quantity: { type: "integer", minimum: 1 },
      },
    },
  })
  create(@Body() body: unknown) {
    const parsed = proposalSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException("Invalid catalog proposal");
    return this.recipes.createProposal(parsed.data);
  }

  @Post(":authorizationId/evaluate")
  @ApiOperation({ summary: "Evaluate an immutable Recipe proposal once" })
  evaluate(@Param("authorizationId") authorizationId: string) {
    return this.recipes.evaluate(decodeURIComponent(authorizationId));
  }

  @Post(":authorizationId/executions")
  @ApiOperation({ summary: "Record an approved Recipe execution receipt" })
  @ApiBody({
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["proposalDigest", "executionReference"],
      properties: {
        proposalDigest: { type: "string", pattern: "^0x[a-fA-F0-9]{64}$" },
        executionReference: { type: "string" },
        transactionHash: { type: "string", pattern: "^0x[a-fA-F0-9]{64}$" },
      },
    },
  })
  complete(
    @Param("authorizationId") authorizationId: string,
    @Body() body: unknown,
  ) {
    const parsed = executionSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException("Invalid execution receipt");
    return this.recipes.completeExecution(
      decodeURIComponent(authorizationId),
      parsed.data,
    );
  }
}
