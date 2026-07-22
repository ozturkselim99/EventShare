import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { randomUUID } from "crypto";
import { JobsController } from "./jobs/jobs.controller";
import { MediaProcessingService } from "./services/media-processing.service";
import { ImageService } from "./services/image.service";
import { VideoService } from "./services/video.service";
import { PrismaService } from "./prisma.service";
import { WorkerStorageConfigValidator } from "./worker-storage-config.validator";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? "info",
        genReqId: (req) => req.headers["x-request-id"] ?? randomUUID(),
        redact: ["req.headers.authorization"],
        transport:
          process.env.NODE_ENV === "production"
            ? undefined
            : { target: "pino-pretty", options: { singleLine: true } },
      },
    }),
  ],
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
