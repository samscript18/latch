import { Injectable } from "@nestjs/common";
import {
  AgentRoleSchema,
  AgentStatusSchema,
  CapabilitySchema,
  type AgentRole,
  type AgentStatus,
  type Capability,
} from "@latch/shared";

@Injectable()
export class EnsRecordParser {
  parseRole(value: string | null): AgentRole | null {
    return this.parseEnum(value, AgentRoleSchema);
  }

  parseStatus(value: string | null): AgentStatus | null {
    return this.parseEnum(value, AgentStatusSchema);
  }

  parseCapabilities(value: string | null): Capability[] {
    if (!value?.trim()) return [];

    const values = this.parseList(value);
    return [
      ...new Set(
        values.flatMap((entry) => {
          const result = CapabilitySchema.safeParse(entry.trim());
          return result.success ? [result.data] : [];
        }),
      ),
    ];
  }

  parseOrganization(value: string | null): string | null {
    const normalized = value?.trim().toLowerCase();
    return normalized ? normalized : null;
  }

  parsePolicyVersion(value: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private parseEnum<T>(
    value: string | null,
    schema: {
      safeParse(
        input: unknown,
      ): { success: true; data: T } | { success: false };
    },
  ): T | null {
    const result = schema.safeParse(value?.trim().toLowerCase());
    return result.success ? result.data : null;
  }

  private parseList(value: string): string[] {
    try {
      const parsed: unknown = JSON.parse(value);
      if (
        Array.isArray(parsed) &&
        parsed.every((entry) => typeof entry === "string")
      ) {
        return parsed;
      }
    } catch {
      // ENS text records commonly use comma-delimited values; JSON is optional.
    }
    return value.split(",");
  }
}
