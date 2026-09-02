import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('me')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me/statistics')
export class StatisticsController {
  constructor(private readonly statistics: StatisticsService) {}

  @Get()
  @ApiQuery({ name: 'courseId', required: false, description: 'Filter by course id or slug' })
  get(
    @CurrentUser() user: CurrentUserPayload,
    @Query('courseId') courseId?: string,
  ) {
    return this.statistics.forUser(user.sub, courseId);
  }
}
