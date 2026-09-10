import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import { FlashcardsService } from './flashcards.service';
import {
  SeenWordDto,
  StartFlashcardSessionDto,
  SubmitAnswerDto,
  ToggleDifficultDto,
} from './dto/answer.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../common/decorators/current-user.decorator';

@ApiTags('flashcards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me/flashcards')
export class FlashcardsController {
  constructor(private readonly flashcards: FlashcardsService) {}

  @Get('summary')
  @ApiQuery({ name: 'course', required: true })
  summary(
    @CurrentUser() user: CurrentUserPayload,
    @Query('course') course: string,
  ) {
    return this.flashcards.summary(user.sub, course);
  }

  @Get('progress')
  @ApiQuery({ name: 'course', required: true })
  progress(
    @CurrentUser() user: CurrentUserPayload,
    @Query('course') course: string,
  ) {
    return this.flashcards.listProgress(user.sub, course);
  }

  @Get('review-queue')
  @ApiQuery({ name: 'course', required: true })
  @ApiQuery({ name: 'limit', required: false })
  reviewQueue(
    @CurrentUser() user: CurrentUserPayload,
    @Query('course') course: string,
    @Query('limit') limit?: string,
  ) {
    return this.flashcards.reviewQueue(user.sub, course, Number(limit ?? 20));
  }

  @Get('difficult')
  @ApiQuery({ name: 'course', required: true })
  @ApiQuery({ name: 'limit', required: false })
  difficult(
    @CurrentUser() user: CurrentUserPayload,
    @Query('course') course: string,
    @Query('limit') limit?: string,
  ) {
    return this.flashcards.difficultQueue(user.sub, course, Number(limit ?? 50));
  }

  @Post('seen')
  markSeen(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SeenWordDto,
  ) {
    return this.flashcards.markSeen(user.sub, dto);
  }

  @Post('mark-difficult')
  toggleDifficult(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ToggleDifficultDto,
  ) {
    return this.flashcards.toggleDifficult(user.sub, dto);
  }

  @Post('answers')
  submitAnswer(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.flashcards.submitAnswer(user.sub, dto);
  }

  @Post('sessions')
  startSession(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: StartFlashcardSessionDto,
  ) {
    return this.flashcards.startSession(user.sub, dto);
  }

  @Post('sessions/:id/finish')
  finishSession(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') sessionId: string,
  ) {
    return this.flashcards.finishSession(user.sub, sessionId);
  }
}
