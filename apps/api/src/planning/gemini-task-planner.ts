import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenAI } from "@google/genai";
import type { PlannedAction } from "@latch/shared";
import type { Environment } from "../config/environment.js";
import { reconcilePlannedAction } from "./prompt-intent.js";
import type { TaskPlanner } from "./task-planner.interface.js";

const plannedActionJsonSchema = {
  anyOf: [
    {
      type: "object",
      additionalProperties: false,
      properties: {
        capability: { type: "string", enum: ["procurement.purchase"] },
        productQuery: { type: "string", minLength: 1, maxLength: 200 },
        quantity: { type: "integer", minimum: 1, maximum: 10_000 },
      },
      required: ["capability", "productQuery", "quantity"],
    },
    {
      type: "object",
      additionalProperties: false,
      properties: {
        capability: { type: "string", enum: ["research.search"] },
        query: { type: "string", minLength: 1, maxLength: 500 },
        domains: { type: "array", items: { type: "string" }, maxItems: 20 },
        maxResults: { type: "integer", minimum: 1, maximum: 5 },
      },
      required: ["capability", "query", "domains", "maxResults"],
    },
  ],
};

@Injectable()
export class GeminiTaskPlanner implements TaskPlanner {
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(@Inject(ConfigService) config: ConfigService<Environment, true>) {
    const apiKey = config.get("GOOGLE_CLOUD_API_KEY", { infer: true });
    if (!apiKey)
      throw new ServiceUnavailableException(
        "Vertex AI planner API key is not configured",
      );
    // LATCH uses Vertex AI Express Mode so the planner stays within the
    // Google Cloud integration boundary while retaining server-side API-key
    // authentication. The browser never receives this credential.
    this.client = new GoogleGenAI({ vertexai: true, apiKey });
    this.model =
      config.get("GEMINI_MODEL", { infer: true }) ?? "gemini-3.8-flash";
  }

  async plan(prompt: string): Promise<PlannedAction> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        systemInstruction:
          "Convert the request into one proposed LATCH action. You may only select a listed capability. " +
          "Procurement includes finding, sourcing, comparing, buying, purchasing, or ordering physical products and workplace equipment, including laptops, notebooks, monitors, tablets, desktops, computers, keyboards, mice, headsets, printers, phones, equipment, and devices. Singular and plural forms have the same meaning. " +
          "The verb 'find' alone does not mean research: finding, sourcing, or comparing a physical product for acquisition is procurement. " +
          "Research means gathering information, web sources, articles, papers, or reports; never classify physical-product sourcing as research. " +
          "For procurement return productQuery and quantity. For research return query, optional domains, and maxResults. " +
          "For research, use an empty domains array unless the user explicitly names domains, and default maxResults to 5. " +
          "You propose intent only and must never claim authorization, a policy verdict, an ENS role, or a price.",
        responseMimeType: "application/json",
        responseJsonSchema: plannedActionJsonSchema,
      },
    });
    if (!response.text)
      throw new ServiceUnavailableException("Vertex AI returned no plan");
    try {
      const rawPlan: unknown = JSON.parse(response.text);
      return reconcilePlannedAction(prompt, rawPlan);
    } catch {
      throw new ServiceUnavailableException(
        "Vertex AI returned an invalid structured plan",
      );
    }
  }
}
