import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ProgressService } from './progress.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('me')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me/progress')
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.progress.listForUser(user.sub);
  }
}
