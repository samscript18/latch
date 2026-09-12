import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AgentTypeSchema } from "@latch/shared";
import { z } from "zod";
import { WalletAuthGuard } from "../auth/wallet-auth.guard.js";
import type { WalletAuthenticatedRequest } from "../auth/auth.types.js";
import { AgentsService } from "./agents.service.js";
import { agentTypeRegistry } from "./agent-type.registry.js";

const createAgentSchema = z
  .object({
    type: AgentTypeSchema,
    ensName: z.string().trim().min(3).max(255),
    wallet: z.string().trim(),
  })
  .strict();

@Controller("agents")
export class AgentsController {
  constructor(@Inject(AgentsService) private readonly agents: AgentsService) {}

  @Get("types")
  types() {
    return Object.values(agentTypeRegistry);
  }

  @Post()
  @UseGuards(WalletAuthGuard)
  create(
    @Body() body: unknown,
    @Req() request: WalletAuthenticatedRequest,
  ) {
    const parsed = createAgentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid AI worker configuration");
    }
    return this.agents.createForOwner(
      request.walletSession!.address,
      parsed.data,
    );
  }

  @Get()
  @UseGuards(WalletAuthGuard)
  list(@Req() request: WalletAuthenticatedRequest) {
    return this.agents.listForOwner(request.walletSession!.address);
  }

  @Get(":ensName")
  findOne(@Param("ensName") ensName: string) {
    return this.agents.findByEnsName(ensName);
  }

  @Post(":ensName/revoke")
  @UseGuards(WalletAuthGuard)
  revoke(
    @Param("ensName") ensName: string,
    @Req() request: WalletAuthenticatedRequest,
  ) {
    return this.agents.revoke(ensName, request.walletSession!.address);
  }
}
