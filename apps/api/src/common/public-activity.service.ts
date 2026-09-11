import { Injectable, Logger } from "@nestjs/common";
import { redactForLog } from "./log-redaction.js";

export interface PublicActivityEvent {
  taskId: string;
  agentName: string;
  capability: string;
  stage: "authorization" | "ens" | "policy";
  result: "started" | "authorized" | "blocked" | "failed";
  publicDenialCode?: string;
}

@Injectable()
export class PublicActivityService {
  private readonly logger = new Logger("AuthorizationActivity");

  record(event: PublicActivityEvent): void {
    // The allowlisted event shape deliberately excludes amount, vendor, policy, and secrets.
    this.logger.log(JSON.stringify(redactForLog(event)));
  }
}
