import { Module } from "@nestjs/common";
import { XpController } from "./xp.controller";
import { XpService } from "./xp.service";

@Module({
  providers: [XpService],
  controllers: [XpController],
  exports: [XpService],
})
export class XpModule {}
