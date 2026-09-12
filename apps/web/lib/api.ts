const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface EnsIdentity {
  name: string;
  wallet: string | null;
  role: string | null;
  status: string | null;
  capabilities: string[];
  organization: string | null;
  policyVersion: string | null;
  resolver: string | null;
  checkedAtBlock?: string;
}

export interface AgentView {
  id: string;
  displayName: string;
  ensName: string;
  expectedWallet: string;
  intendedRole: "procurement" | "research" | null;
  intendedCapabilities: Array<"procurement.purchase" | "research.search">;
  intendedPolicyVersion: string | null;
  provisioningStatus: "pending_ens" | "verified";
  ensVerified: boolean;
  identity: EnsIdentity | null;
  lastEnsCheckedAt: string | null;
  recentActivity: Array<{
    id: string;
    type: string;
    result: string;
    message: string;
    createdAt: string;
  }>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : body?.message;
    throw new ApiError(
      message ?? `LATCH API returned HTTP ${response.status}`,
      response.status,
    );
  }
  return response.json() as Promise<T>;
}
