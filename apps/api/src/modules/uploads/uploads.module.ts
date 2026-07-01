import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { UploadsService } from "./uploads.service";
import { UploadsController } from "./uploads.controller";
import { EventsModule } from "../events/events.module";
import { StorageModule } from "../storage/storage.module";
import { QstashModule } from "../queue/qstash.module";

@Module({
  imports: [
    EventsModule,
    StorageModule,
    JwtModule.register({}),
    QstashModule,
  ],
  providers: [UploadsService],
  controllers: [UploadsController],
})
export class UploadsModule {}
