import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";
import type { Environment } from "../config/environment.js";
import { markIntegrationSuccess } from "../common/integration-telemetry.js";

const TavilyResponseSchema = z.object({
  request_id: z.string().min(1).optional(),
  results: z.array(
    z.object({
      title: z.string(),
      url: z.url(),
      content: z.string(),
      score: z.number().min(0).max(1).optional(),
    }),
  ),
});

export interface ResearchExecutionInput {
  query: string;
  domains: string[];
  maxResults: number;
}

@Injectable()
export class TavilyResearchProvider {
  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService<Environment, true>,
  ) {}

  async search(input: ResearchExecutionInput) {
    const apiKey = this.config.get("TAVILY_API_KEY", { infer: true });
    if (!apiKey) {
      throw new ServiceUnavailableException("Tavily research is not configured");
    }

    let response: Response;
    try {
      response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query: input.query,
          max_results: input.maxResults,
          include_domains: input.domains,
          include_answer: false,
          include_raw_content: false,
          search_depth: "basic",
        }),
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      throw new ServiceUnavailableException("Tavily research is unavailable");
    }
    if (!response.ok) {
      throw new ServiceUnavailableException("Tavily research is unavailable");
    }
    const parsed = TavilyResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new ServiceUnavailableException("Tavily returned an invalid response");
    }
    const headerReference = response.headers.get("x-request-id") ?? undefined;
    markIntegrationSuccess("tavily");
    return {
      results: parsed.data.results,
      executionReference: parsed.data.request_id ?? headerReference,
      provider: "tavily" as const,
    };
  }
}
