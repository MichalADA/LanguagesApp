import { Module } from "@nestjs/common";
import { StoriesController } from "./stories.controller";
import { StoriesService } from "./stories.service";

@Module({
  providers: [StoriesService],
  controllers: [StoriesController],
  exports: [StoriesService],
})
export class StoriesModule {}
