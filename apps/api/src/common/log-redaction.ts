const sensitiveKey =
  /(secret|private.?key|api.?key|authorization|token|threshold|allowlist)/i;

export function redactForLog(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactForLog);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [
      key,
      sensitiveKey.test(key) ? "[REDACTED]" : redactForLog(nested),
    ]),
  );
}
