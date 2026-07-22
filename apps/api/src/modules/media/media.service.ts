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

  private encodeCursor(createdAt: Date, id: string): string {
    return Buffer.from(`${createdAt.toISOString()}_${id}`, "utf8").toString(
      "base64url",
    );
  }

  private decodeCursor(cursor: string): { createdAt: Date; id: string } {
    const [iso, id] = Buffer.from(cursor, "base64url")
      .toString("utf8")
      .split("_");
    const createdAt = new Date(iso);
    if (!id || Number.isNaN(createdAt.getTime())) {
      throw new NotFoundException("Invalid cursor");
    }
    return { createdAt, id };
  }

  async findByEvent(
    eventId: string,
    query: { cursor?: string; limit?: number; type?: string; sort?: string },
  ) {
    const limit = query.limit ?? 40;
    const oldest = query.sort === "oldest";
    const orderBy = oldest
      ? [{ createdAt: "asc" as const }, { id: "asc" as const }]
      : [{ createdAt: "desc" as const }, { id: "desc" as const }];

    // Compound keyset cursor (createdAt, id) — required because createdAt
    // alone isn't unique (bursts of concurrent uploads share a timestamp),
    // and id alone isn't sort-ordered (UUIDs aren't monotonic).
    const cursorFilter = query.cursor
      ? (() => {
          const c = this.decodeCursor(query.cursor as string);
          return oldest
            ? {
                OR: [
                  { createdAt: { gt: c.createdAt } },
                  { createdAt: c.createdAt, id: { gt: c.id } },
                ],
              }
            : {
                OR: [
                  { createdAt: { lt: c.createdAt } },
                  { createdAt: c.createdAt, id: { lt: c.id } },
                ],
              };
        })()
      : {};

    const items = await this.prisma.media.findMany({
      where: {
        eventId,
        status: MediaStatus.READY,
        deletedAt: null,
        ...(query.type && { type: query.type as "IMAGE" | "VIDEO" }),
        ...cursorFilter,
      },
      orderBy,
      take: limit + 1,
    });

    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, limit) : items;
    const last = data[data.length - 1];

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
      nextCursor: hasMore && last ? this.encodeCursor(last.createdAt, last.id) : null,
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
