import { ConfigService } from "@nestjs/config";
import type { Environment } from "../apps/api/src/config/environment.js";
import { AuditService } from "../apps/api/src/audit/audit.service.js";

const config = new ConfigService({
  ...process.env,
  HACKATHON_MODE: process.env.HACKATHON_MODE === "true",
}) as ConfigService<Environment, true>;
const audit = new AuditService(config);
const status = await audit.status();
console.table(status);
if (status.state !== "connected") {
  throw new Error("LatchAudit deployment verification failed");
}

if (!process.argv.includes("--execute")) {
  console.log(
    "Run npm run verify:audit -- --execute to emit a sanitized requested/blocked smoke pair.",
  );
  process.exit(0);
}

const smoke = {
  taskId: `audit-smoke-${Date.now()}`,
  agentName:
    process.env.DEMO_PROCUREMENT_AGENT_ENS ?? "procurement.latchsecurity.eth",
};
const requested = await audit.recordRequested({
  ...smoke,
  capability: "procurement.purchase",
  amountCents: 0,
});
console.log(`Requested transaction: ${requested}`);
const blocked = await audit.recordBlocked({
  ...smoke,
  reasonCode: "CAPABILITY_UNAVAILABLE",
});
console.log(`Blocked transaction: ${blocked}`);
console.log(`Smoke task reference: ${smoke.taskId}`);
