import { Body, Controller, Get, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../common/decorators/current-user.decorator";
import { AwardXpDto, DailyGoalDto } from "./xp.dto";
import { XpService } from "./xp.service";

@ApiTags("xp")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("me/xp")
export class XpController {
  constructor(private readonly xp: XpService) {}

  @Get()
  summary(@CurrentUser() user: CurrentUserPayload) {
    return this.xp.summary(user.sub);
  }

  /** Safe to retry with the same eventId. */
  @Post("events")
  award(@CurrentUser() user: CurrentUserPayload, @Body() dto: AwardXpDto) {
    return this.xp.award(user.sub, dto);
  }

  @Put("goal")
  goal(@CurrentUser() user: CurrentUserPayload, @Body() dto: DailyGoalDto) {
    return this.xp.setGoal(user.sub, dto.goal);
  }
}
