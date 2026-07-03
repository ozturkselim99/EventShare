import { Module } from "@nestjs/common";
import { QstashService } from "./qstash.service";

@Module({
  providers: [QstashService],
  exports: [QstashService],
})
export class QstashModule {}
