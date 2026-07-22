import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { EventsService } from "../events/events.service";
import { STORAGE_PROVIDER, StorageProvider } from "../storage/storage.interface";
import { QstashService } from "../queue/qstash.service";
import type { PresignDto } from "./dto/presign.dto";
import type { CompleteUploadDto } from "./dto/complete-upload.dto";
import { MediaStatus, JobName } from "@eventshare/shared";

@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly qstash: QstashService,
  ) {}

  async presign(
    token: string,
    dto: PresignDto,
    ip: string,
    userAgent: string,
  ) {
    const event = await this.events.findByToken(token);

    if (!event.allowUploads) {
      throw new ForbiddenException("Uploads are disabled for this event");
    }

    if (this.events.isExpired(event) && event.expirationMode !== "VIEW_ONLY") {
      throw new ForbiddenException("This event has expired");
    }

    const isVideo = dto.mimeType.startsWith("video/");
    const maxBytes = isVideo
      ? (this.config.get<number>("app.maxVideoSizeMb") ?? 500) * 1024 * 1024
      : (this.config.get<number>("app.maxImageSizeMb") ?? 50) * 1024 * 1024;

    if (dto.size > maxBytes) {
      throw new BadRequestException(
        `File too large. Maximum is ${maxBytes / (1024 * 1024)} MB`,
      );
    }

    const ext = dto.filename.split(".").pop() ?? "bin";
    const safeFilename = `${randomBytes(8).toString("hex")}.${ext}`;
    const storageKey = `events/${event.id}/original/${safeFilename}`;

    const media = await this.prisma.$transaction(async (tx) => {
      if (event.maxUploads) {
        // Lock the event row so concurrent presigns near the cap can't all
        // pass the count check before any of them commits (TOCTOU).
        await tx.$queryRaw`SELECT id FROM events WHERE id = ${event.id}::uuid FOR UPDATE`;
        const count = await tx.media.count({
          where: { eventId: event.id, deletedAt: null },
        });
        if (count >= event.maxUploads) {
          throw new ForbiddenException("Event upload limit reached");
        }
      }

      return tx.media.create({
        data: {
          eventId: event.id,
          type: isVideo ? "VIDEO" : "IMAGE",
          status: MediaStatus.PENDING_UPLOAD,
          storageKey,
          uploadedBy: dto.uploadedBy ?? null,
          size: BigInt(dto.size),
          mimeType: dto.mimeType,
        },
      });
    });

    const ttl = this.config.get<number>("app.presignedUrlTtlSeconds") ?? 600;
    const presigned = await this.storage.createPresignedPutUrl({
      key: storageKey,
      mimeType: dto.mimeType,
      size: dto.size,
      ttlSeconds: ttl,
    });

    const uploadToken = this.jwt.sign(
      { mediaId: media.id, storageKey },
      {
        secret: this.config.get<string>("app.jwtAccessSecret"),
        expiresIn: ttl + 60,
      },
    );

    await this.prisma.upload.create({
      data: {
        mediaId: media.id,
        ipAddress: ip,
        userAgent: userAgent ?? "",
        uploadTokenHash: createHash("sha256").update(uploadToken).digest("hex"),
      },
    });

    return {
      mediaId: media.id,
      uploadUrl: presigned.url,
      method: "PUT",
      storageKey,
      expiresInSeconds: ttl,
      headers: presigned.headers,
      uploadToken,
    };
  }

  async complete(token: string, dto: CompleteUploadDto) {
    await this.events.findByToken(token);

    const media = await this.prisma.media.findFirst({
      where: { id: dto.mediaId, deletedAt: null },
    });
    if (!media) throw new NotFoundException("Media not found");

    // Already completed (or beyond) — treat as an idempotent replay instead
    // of erroring, so client/QStash retries of `complete` are safe.
    if (media.status !== MediaStatus.PENDING_UPLOAD) {
      return { mediaId: media.id, status: media.status };
    }

    const tokenHash = createHash("sha256").update(dto.uploadToken).digest("hex");
    const uploadRecord = await this.prisma.upload.findFirst({
      where: { mediaId: dto.mediaId, uploadTokenHash: tokenHash },
    });
    if (!uploadRecord) throw new ForbiddenException("Invalid upload token");

    const outcome = await this.prisma.$transaction(async (tx) => {
      if (dto.checksumSha256) {
        const duplicate = await tx.media.findFirst({
          where: {
            eventId: media.eventId,
            checksumSha256: dto.checksumSha256,
            id: { not: media.id },
            deletedAt: null,
            status: { in: ["UPLOADED", "PROCESSING", "READY"] },
          },
        });
        if (duplicate) {
          await tx.media.update({
            where: { id: media.id },
            data: { status: MediaStatus.DELETED, deletedAt: new Date() },
          });
          return { publish: false, mediaId: duplicate.id, status: duplicate.status };
        }
      }

      // Atomic claim: only the caller that flips PENDING_UPLOAD -> UPLOADED
      // is allowed to publish the processing job.
      const claim = await tx.media.updateMany({
        where: { id: media.id, status: MediaStatus.PENDING_UPLOAD },
        data: {
          status: MediaStatus.UPLOADED,
          ...(dto.checksumSha256 && { checksumSha256: dto.checksumSha256 }),
        },
      });
      if (claim.count === 0) {
        const current = await tx.media.findUnique({ where: { id: media.id } });
        return { publish: false, mediaId: media.id, status: current?.status ?? media.status };
      }

      return { publish: true, mediaId: media.id, status: MediaStatus.UPLOADED };
    });

    if (outcome.publish) {
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
    }

    return { mediaId: outcome.mediaId, status: outcome.status };
  }
}
