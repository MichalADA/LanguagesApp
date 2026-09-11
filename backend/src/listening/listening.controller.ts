import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ListeningService } from './listening.service';

@ApiTags('listening')
@Controller('listening')
export class ListeningController {
  constructor(private readonly listening: ListeningService) {}

  @Get('sources')
  listSources() {
    return this.listening.listSources();
  }

  @Get('sources/:slug')
  getSource(@Param('slug') slug: string) {
    return this.listening.getSourceBySlug(slug);
  }

  @Get('sources/:slug/units')
  listUnits(@Param('slug') slug: string) {
    return this.listening.listUnits(slug);
  }

  @Get('lessons/:id')
  getLesson(@Param('id') id: string) {
    return this.listening.getLesson(id);
  }
}
