import { ProgressModule } from '../progress/progress.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { Module } from '@nestjs/common';

import { FlashcardsService } from './flashcards.service';
import { FlashcardsController } from './flashcards.controller';

@Module({
  imports: [ReviewsModule, ProgressModule],
  providers: [FlashcardsService],
  controllers: [FlashcardsController],
  exports: [FlashcardsService],
})
export class FlashcardsModule {}
