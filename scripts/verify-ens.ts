import { EnsAgentIdentitySchema } from "@latch/shared";

const apiUrl = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/$/, "");

async function resolve(name: string) {
  const response = await fetch(`${apiUrl}/ens/${encodeURIComponent(name)}`);
  if (!response.ok)
    throw new Error(
      `ENS verification failed for ${name}: HTTP ${response.status}`,
    );
  const identity = EnsAgentIdentitySchema.parse(await response.json());
  if (!identity.wallet || !identity.role || identity.status !== "active") {
    throw new Error(
      `${name} does not resolve to a complete active LATCH identity`,
    );
  }
  console.log(
    `${name}: ACTIVE ${identity.role} at block ${identity.checkedAtBlock ?? "unknown"}`,
  );
}

async function main(): Promise<void> {
  const names = [
    process.env.DEMO_PROCUREMENT_AGENT_ENS,
    process.env.DEMO_RESEARCH_AGENT_ENS,
  ].filter((name): name is string => Boolean(name));
  if (names.length !== 2)
    throw new Error("Both demo agent ENS names are required");
  for (const name of names) await resolve(name);
}

void main();
