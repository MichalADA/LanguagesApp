import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { LearningService } from './learning.service';
import { StartSessionDto } from './dto/start-session.dto';
import { RecordAnswerDto } from './dto/record-answer.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('learning')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me/learning')
export class LearningController {
  constructor(private readonly learning: LearningService) {}

  @Get('sessions')
  listSessions(@CurrentUser() user: CurrentUserPayload) {
    return this.learning.listSessions(user.sub);
  }

  @Post('sessions')
  startSession(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: StartSessionDto,
  ) {
    return this.learning.startSession(user.sub, dto.course);
  }

  @Post('sessions/:sessionId/answers')
  recordAnswer(
    @CurrentUser() user: CurrentUserPayload,
    @Param('sessionId') sessionId: string,
    @Body() dto: RecordAnswerDto,
  ) {
    return this.learning.recordAnswer(user.sub, sessionId, dto);
  }

  @Post('sessions/:sessionId/finish')
  finish(
    @CurrentUser() user: CurrentUserPayload,
    @Param('sessionId') sessionId: string,
  ) {
    return this.learning.finishSession(user.sub, sessionId);
  }
}
