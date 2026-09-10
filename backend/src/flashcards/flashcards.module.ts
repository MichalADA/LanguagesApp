import { Module } from '@nestjs/common';

import { FlashcardsService } from './flashcards.service';
import { FlashcardsController } from './flashcards.controller';

@Module({
  providers: [FlashcardsService],
  controllers: [FlashcardsController],
  exports: [FlashcardsService],
})
export class FlashcardsModule {}
