import { ReviewsModule } from '../reviews/reviews.module';
import { Module } from '@nestjs/common';

import { LearningService } from './learning.service';
import { LearningController } from './learning.controller';
import { ProgressModule } from '../progress/progress.module';

@Module({
  imports: [ProgressModule, ReviewsModule],
  providers: [LearningService],
  controllers: [LearningController],
  exports: [LearningService],
})
export class LearningModule {}
