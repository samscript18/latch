type IntegrationName = "ensv2" | "chainlink" | "bazantic" | "tavily";

const lastSuccess = new Map<IntegrationName, string>();

export function markIntegrationSuccess(name: IntegrationName): string {
  const timestamp = new Date().toISOString();
  lastSuccess.set(name, timestamp);
  return timestamp;
}

export function lastIntegrationSuccess(name: IntegrationName): string | null {
  return lastSuccess.get(name) ?? null;
}
