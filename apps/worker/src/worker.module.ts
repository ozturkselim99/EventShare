import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { MediaProcessor } from "./processors/media.processor";
import { ImageService } from "./services/image.service";
import { VideoService } from "./services/video.service";
import { PrismaService } from "./prisma.service";
import { QueueName } from "@eventshare/shared";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>("REDIS_URL") ?? "redis://localhost:6379",
        },
      }),
    }),

    BullModule.registerQueue({ name: QueueName.MEDIA_PROCESSING }),
    BullModule.registerQueue({ name: QueueName.MAINTENANCE }),
  ],
  providers: [PrismaService, ImageService, VideoService, MediaProcessor],
})
export class WorkerModule {}
