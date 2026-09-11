import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ReviewItemType } from "@prisma/client";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../common/decorators/current-user.decorator";
import { ReviewsService } from "./reviews.service";
import { ReviewAnswerDto } from "./review.dto";
@Controller("reviews")
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}
  @Get("due")
  due(
    @CurrentUser() user: CurrentUserPayload,
    @Query("course") course?: string,
    @Query("language") language?: string,
    @Query("itemType") type?: string,
    @Query("limit") raw?: string,
  ) {
    if (type && !Object.values(ReviewItemType).includes(type as ReviewItemType))
      throw new BadRequestException("Invalid itemType");
    const limit = raw === undefined ? 20 : Number(raw);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new BadRequestException("Limit must be 1–100");
    return this.reviews.due(user.sub, {
      course,
      language,
      itemType: type as ReviewItemType | undefined,
      limit,
    });
  }
  @Get("progress")
  progress(
    @CurrentUser() user: CurrentUserPayload,
    @Query("course") course: string,
    @Query("cursor") cursor?: string,
  ) {
    if (!course) throw new BadRequestException("Course is required");
    return this.reviews.progress(user.sub, course, cursor);
  }
  @Get("stats") stats(
    @CurrentUser() user: CurrentUserPayload,
    @Query("course") course?: string,
  ) {
    return this.reviews.stats(user.sub, course);
  }
  @Post("answer") answer(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ReviewAnswerDto,
  ) {
    return this.reviews.answer(user.sub, dto);
  }
}
