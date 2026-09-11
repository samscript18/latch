import { Controller, Get, Inject } from "@nestjs/common";
import { IntegrationsService } from "./integrations.service.js";

@Controller("integrations")
export class IntegrationsController {
  constructor(
    @Inject(IntegrationsService)
    private readonly integrations: IntegrationsService,
  ) {}

  @Get("status")
  status() {
    return this.integrations.status();
  }
}
