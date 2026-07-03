import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { ImageService } from "./image.service";
import { VideoService } from "./video.service";
import {
  JobName,
  MediaStatus,
  type ProcessMediaJobData,
} from "@eventshare/shared";

@Injectable()
export class MediaProcessingService {
  private readonly logger = new Logger(MediaProcessingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly imageService: ImageService,
    private readonly videoService: VideoService,
  ) {}

  async process(jobName: JobName, data: ProcessMediaJobData) {
    const { mediaId, eventId, storageKey } = data;
    this.logger.log(`Processing job ${jobName} for media ${mediaId}`);

    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) {
      this.logger.warn(`Media ${mediaId} not found, skipping`);
      return;
    }
    // Idempotency: skip if already processed (QStash may retry/redeliver)
    if (media.status === MediaStatus.READY) {
      this.logger.log(`Media ${mediaId} already READY, skipping`);
      return;
    }

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
        variants?: Array<{
          key: string;
          kind: "THUMBNAIL" | "OPTIMIZED" | "VIDEO_PREVIEW";
          size: bigint;
        }>;
      };

      if (jobName === JobName.PROCESS_IMAGE) {
        result = await this.imageService.process(storageKey, eventId, mediaId);
      } else if (jobName === JobName.PROCESS_VIDEO) {
        result = await this.videoService.process(storageKey, eventId, mediaId);
      } else {
        throw new Error(`Unknown job name: ${jobName}`);
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
}
