import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { STORAGE_PROVIDER, StorageProvider } from "../storage/storage.interface";
import { MediaStatus } from "@eventshare/shared";

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async findByEvent(
    eventId: string,
    query: { cursor?: string; limit?: number; type?: string; sort?: string },
  ) {
    const limit = query.limit ?? 40;
    const orderBy =
      query.sort === "oldest"
        ? [{ createdAt: "asc" as const }, { id: "asc" as const }]
        : [{ createdAt: "desc" as const }, { id: "desc" as const }];

    const items = await this.prisma.media.findMany({
      where: {
        eventId,
        status: MediaStatus.READY,
        deletedAt: null,
        ...(query.type && { type: query.type as "IMAGE" | "VIDEO" }),
        ...(query.cursor && { id: { lt: query.cursor } }),
      },
      orderBy,
      take: limit + 1,
    });

    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, limit) : items;

    return {
      data: data.map((m: (typeof data)[number]) => ({
        id: m.id,
        type: m.type,
        thumbnailUrl: m.thumbnailUrl,
        originalUrl: m.originalUrl,
        uploadedBy: m.uploadedBy,
        createdAt: m.createdAt,
        width: m.width,
        height: m.height,
        durationSeconds: m.durationSeconds,
      })),
      nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null,
      hasMore,
    };
  }

  async findAdminByEvent(
    eventId: string,
    query: { page?: number; limit?: number },
  ) {
    const { page = 1, limit = 40 } = query;
    const [data, total] = await Promise.all([
      this.prisma.media.findMany({
        where: { eventId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.media.count({ where: { eventId, deletedAt: null } }),
    ]);
    return { data, total, page, limit };
  }

  async softDelete(mediaId: string) {
    const media = await this.prisma.media.findFirst({
      where: { id: mediaId, deletedAt: null },
      include: { variants: true },
    });
    if (!media) throw new NotFoundException("Media not found");

    const keys = [
      media.storageKey,
      media.thumbnailKey,
      media.previewKey,
      ...media.variants.map((v) => v.storageKey),
    ].filter((key): key is string => Boolean(key));

    for (const key of keys) {
      try {
        await this.storage.deleteObject(key);
      } catch {
        // Best-effort cleanup; DB soft-delete still proceeds
      }
    }

    return this.prisma.media.update({
      where: { id: mediaId },
      data: { deletedAt: new Date(), status: MediaStatus.DELETED },
    });
  }

  async getDownloadUrl(mediaId: string) {
    const media = await this.prisma.media.findFirst({
      where: { id: mediaId, status: MediaStatus.READY, deletedAt: null },
    });
    if (!media) throw new NotFoundException("Media not found");

    const url = await this.storage.createPresignedGetUrl({
      key: media.storageKey,
      ttlSeconds: 300,
    });

    return { url, filename: media.storageKey.split("/").pop() };
  }

  async reprocess(mediaId: string) {
    const media = await this.prisma.media.findFirst({
      where: { id: mediaId, deletedAt: null },
    });
    if (!media) throw new NotFoundException("Media not found");

    return this.prisma.media.update({
      where: { id: mediaId },
      data: { status: MediaStatus.UPLOADED },
    });
  }

  async getAllMediaForDownload(eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
    });
    if (!event) throw new NotFoundException("Event not found");

    const mediaList = await this.prisma.media.findMany({
      where: {
        eventId,
        status: MediaStatus.READY,
        deletedAt: null,
      },
      orderBy: { createdAt: "asc" },
    });

    return { event, mediaList };
  }
}
