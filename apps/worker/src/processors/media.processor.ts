import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { PrismaService } from "../prisma.service";
import { ImageService } from "../services/image.service";
import { VideoService } from "../services/video.service";
import {
  JobName,
  MediaStatus,
  QueueName,
  type ProcessMediaJobData,
} from "@eventshare/shared";

@Processor(QueueName.MEDIA_PROCESSING, { concurrency: 4 })
export class MediaProcessor extends WorkerHost {
  private readonly logger = new Logger(MediaProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly imageService: ImageService,
    private readonly videoService: VideoService,
  ) {
    super();
  }

  async process(job: Job<ProcessMediaJobData>) {
    const { mediaId, eventId, storageKey, type } = job.data;
    this.logger.log(`Processing job ${job.name} for media ${mediaId}`);

    await this.prisma.media.update({
      where: { id: mediaId },
      data: { status: MediaStatus.PROCESSING },
    });

    // ── Local dev fast-path ──────────────────────────────────────────────────
    if (process.env.STORAGE_PROVIDER === "local") {
      const apiUrl = `http://localhost:${process.env.API_PORT ?? "3001"}`;
      const fileUrl = `${apiUrl}/api/v1/dev-upload/file?key=${encodeURIComponent(storageKey)}`;
      await this.prisma.media.update({
        where: { id: mediaId },
        data: {
          status: MediaStatus.READY,
          originalUrl: fileUrl,
          thumbnailUrl: fileUrl,
        },
      });
      this.logger.log(`Local dev: media ${mediaId} marked READY (no processing)`);
      return;
    }
    // ────────────────────────────────────────────────────────────────────────

    try {
      let result: {
        thumbnailKey?: string | null;
        thumbnailUrl?: string | null;
        previewKey?: string | null;
        originalUrl: string | null;
        width?: number | null;
        height?: number | null;
        durationSeconds?: number | null;
        variants?: Array<{ key: string; kind: "THUMBNAIL" | "OPTIMIZED" | "VIDEO_PREVIEW"; size: bigint }>;
      };

      if (job.name === JobName.PROCESS_IMAGE) {
        result = await this.imageService.process(storageKey, eventId, mediaId);
      } else if (job.name === JobName.PROCESS_VIDEO) {
        result = await this.videoService.process(storageKey, eventId, mediaId);
      } else {
        throw new Error(`Unknown job name: ${job.name}`);
      }

      await this.prisma.$transaction(async (tx: any) => {
        await tx.media.update({
          where: { id: mediaId },
          data: {
            status: MediaStatus.READY,
            originalUrl: result.originalUrl,
            thumbnailUrl: result.thumbnailUrl ?? null,
            thumbnailKey: result.thumbnailKey ?? null,
            previewKey: result.previewKey ?? null,
            width: result.width ?? null,
            height: result.height ?? null,
            durationSeconds: result.durationSeconds ?? null,
          },
        });

        if (result.variants?.length) {
          await tx.mediaVariant.createMany({
            data: result.variants.map((v) => ({
              mediaId,
              kind: v.kind,
              storageKey: v.key,
              size: v.size,
            })),
            skipDuplicates: true,
          });
        }
      });

      this.logger.log(`Media ${mediaId} processing complete`);
    } catch (error) {
      this.logger.error(`Media ${mediaId} processing failed: ${error}`);
      await this.prisma.media.update({
        where: { id: mediaId },
        data: { status: MediaStatus.FAILED },
      });
      throw error;
    }
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`);
  }
}
