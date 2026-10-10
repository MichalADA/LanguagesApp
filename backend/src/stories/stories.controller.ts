import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../common/decorators/current-user.decorator";
import { StoriesService } from "./stories.service";
import { CompleteMissionDto } from "./stories.dto";

@ApiTags("stories")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("stories")
export class StoriesController {
  constructor(private readonly stories: StoriesService) {}

  @Get(":storyId/progress")
  progress(
    @CurrentUser() user: CurrentUserPayload,
    @Param("storyId") storyId: string,
    @Query("course") course?: string,
  ) {
    if (!course) throw new BadRequestException("Course is required");
    return this.stories.progress(user.sub, course, storyId);
  }

  /** Safe to retry with the same eventId. */
  @Post(":storyId/missions/:missionId/complete")
  complete(
    @CurrentUser() user: CurrentUserPayload,
    @Param("storyId") storyId: string,
    @Param("missionId") missionId: string,
    @Body() dto: CompleteMissionDto,
  ) {
    return this.stories.complete(user.sub, storyId, missionId, dto);
  }
}
