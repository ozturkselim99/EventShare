import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JobsController } from "./jobs/jobs.controller";
import { MediaProcessingService } from "./services/media-processing.service";
import { ImageService } from "./services/image.service";
import { VideoService } from "./services/video.service";
import { PrismaService } from "./prisma.service";
import { WorkerStorageConfigValidator } from "./worker-storage-config.validator";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [JobsController],
  providers: [
    PrismaService,
    ImageService,
    VideoService,
    MediaProcessingService,
    WorkerStorageConfigValidator,
  ],
})
export class WorkerModule {}
