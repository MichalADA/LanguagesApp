import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { LanguagesService } from './languages.service';

@ApiTags('languages')
@Controller('languages')
export class LanguagesController {
  constructor(private readonly languages: LanguagesService) {}

  @Get()
  list() {
    return this.languages.list();
  }
}
