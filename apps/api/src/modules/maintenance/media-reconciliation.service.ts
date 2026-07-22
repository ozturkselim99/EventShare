import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { QstashService } from "../queue/qstash.service";
import { JobName, MediaStatus } from "@eventshare/shared";

const ABANDONED_PENDING_UPLOAD_MS = 60 * 60 * 1000; // 1h
const STUCK_UPLOADED_MS = 15 * 60 * 1000; // 15m
const STUCK_PROCESSING_MS = 30 * 60 * 1000; // 30m
const BATCH_SIZE = 200;

// Self-healing sweep for the async upload/processing pipeline: cleans up
// abandoned presigns, and requeues media that got stuck because a process
// crashed between committing a DB state change and publishing/consuming the
// next QStash job.
@Injectable()
export class MediaReconciliationService {
  private readonly logger = new Logger(MediaReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly qstash: QstashService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async reconcile() {
    await this.reapAbandonedPendingUploads();
    await this.resetStuckProcessing();
    await this.requeueStuckUploaded();
  }

  private async reapAbandonedPendingUploads() {
    const result = await this.prisma.media.updateMany({
      where: {
        status: MediaStatus.PENDING_UPLOAD,
        deletedAt: null,
        createdAt: { lt: new Date(Date.now() - ABANDONED_PENDING_UPLOAD_MS) },
      },
      data: { status: MediaStatus.DELETED, deletedAt: new Date() },
    });
    if (result.count > 0) {
      this.logger.log(`Reaped ${result.count} abandoned PENDING_UPLOAD media`);
    }
  }

  private async resetStuckProcessing() {
    const result = await this.prisma.media.updateMany({
      where: {
        status: MediaStatus.PROCESSING,
        deletedAt: null,
        updatedAt: { lt: new Date(Date.now() - STUCK_PROCESSING_MS) },
      },
      data: { status: MediaStatus.UPLOADED },
    });
    if (result.count > 0) {
      this.logger.warn(
        `Reset ${result.count} stuck PROCESSING media back to UPLOADED (likely worker crash)`,
      );
    }
  }

  private async requeueStuckUploaded() {
    const stuck = await this.prisma.media.findMany({
      where: {
        status: MediaStatus.UPLOADED,
        deletedAt: null,
        updatedAt: { lt: new Date(Date.now() - STUCK_UPLOADED_MS) },
      },
      take: BATCH_SIZE,
    });

    for (const media of stuck) {
      try {
        await this.qstash.publishMediaJob(
          media.type === "VIDEO" ? JobName.PROCESS_VIDEO : JobName.PROCESS_IMAGE,
          {
            mediaId: media.id,
            eventId: media.eventId,
            storageKey: media.storageKey,
            mimeType: media.mimeType,
            type: media.type,
          },
        );
        this.logger.log(`Requeued stuck UPLOADED media ${media.id}`);
      } catch (error) {
        this.logger.error(`Failed to requeue media ${media.id}: ${error}`);
      }
    }
  }
}
