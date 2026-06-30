import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { JwtModule } from "@nestjs/jwt";
import { UploadsService } from "./uploads.service";
import { UploadsController } from "./uploads.controller";
import { EventsModule } from "../events/events.module";
import { StorageModule } from "../storage/storage.module";
import { QueueName } from "@eventshare/shared";

@Module({
  imports: [
    EventsModule,
    StorageModule,
    JwtModule.register({}),
    BullModule.registerQueue({ name: QueueName.MEDIA_PROCESSING }),
  ],
  providers: [UploadsService],
  controllers: [UploadsController],
})
export class UploadsModule {}
