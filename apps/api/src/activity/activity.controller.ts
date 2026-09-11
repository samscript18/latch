import { Controller, Get, Inject } from "@nestjs/common";
import { ActivityService } from "./activity.service.js";

@Controller("activity")
export class ActivityController {
  constructor(
    @Inject(ActivityService) private readonly activity: ActivityService,
  ) {}

  @Get()
  list() {
    return this.activity.list();
  }
}
