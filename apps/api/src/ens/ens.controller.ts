import { Controller, Get, Inject, Param } from "@nestjs/common";
import { EnsService } from "./ens.service.js";

@Controller("ens")
export class EnsController {
  constructor(@Inject(EnsService) private readonly ensService: EnsService) {}

  @Get(":name")
  async resolve(@Param("name") name: string) {
    const identity = await this.ensService.resolveAgent(name);
    return {
      ...identity,
      checkedAtBlock: identity.checkedAtBlock?.toString(),
    };
  }
}
