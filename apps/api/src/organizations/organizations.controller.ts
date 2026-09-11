import { Controller, Get, Inject } from "@nestjs/common";
import { OrganizationsService } from "./organizations.service.js";

@Controller("organization")
export class OrganizationsController {
  constructor(
    @Inject(OrganizationsService)
    private readonly organizations: OrganizationsService,
  ) {}

  @Get()
  getDemoOrganization() {
    return this.organizations.getDemoOrganization();
  }
}
