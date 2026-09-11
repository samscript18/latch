import { Controller, Get } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import type { Connection } from "mongoose";

const mongooseStates: Readonly<Record<number, string>> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
  99: "uninitialized",
};

@Controller("health")
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  getHealth() {
    const database = mongooseStates[this.connection.readyState] ?? "unknown";
    return {
      status: database === "connected" ? "ok" : "degraded",
      service: "latch-api",
      database,
      timestamp: new Date().toISOString(),
    };
  }
}
