import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../cache/cache.service";
import { ConfigService } from "@nestjs/config";
import type { CreateEventDto } from "./dto/create-event.dto";
import type { UpdateEventDto } from "./dto/update-event.dto";
import { EventStatus, ExpirationMode } from "@eventshare/shared";
import { randomBytes } from "crypto";

const EVENT_TOKEN_CACHE_TTL_SECONDS = 60;
const STATS_CACHE_TTL_SECONDS = 30;
const STATS_CACHE_KEY = "admin:stats";

function eventTokenCacheKey(token: string) {
  return `event:token:${token}`;
}

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly cache: CacheService,
  ) {}

  private generateToken(): string {
    return randomBytes(24).toString("base64url");
  }

  async create(dto: CreateEventDto) {
    const token = this.generateToken();
    const expiresAt = new Date(dto.expiresAt);

    if (expiresAt <= new Date()) {
      throw new BadRequestException("expiresAt must be in the future");
    }

    const maxStorageBytes = dto.maxStorageGb
      ? BigInt(dto.maxStorageGb) * BigInt(1024 * 1024 * 1024)
      : null;

    return this.prisma.event.create({
      data: {
        name: dto.name,
        description: dto.description,
        token,
        status: EventStatus.ACTIVE,
        expirationMode:
          dto.expirationMode ?? ExpirationMode.VIEW_ONLY,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : null,
        expiresAt,
        maxUploads: dto.maxUploads ?? null,
        maxStorageBytes,
      },
    });
  }

  async findAll(query: {
    search?: string;
    status?: EventStatus;
    page?: number;
    limit?: number;
  }) {
    const { search, status, page = 1, limit = 20 } = query;

    const where = {
      deletedAt: null,
      ...(status && { status }),
      ...(search && {
        name: { contains: search, mode: "insensitive" as const },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { media: { where: { deletedAt: null } } } },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: { select: { media: { where: { deletedAt: null } } } },
      },
    });
    if (!event) throw new NotFoundException("Event not found");
    return event;
  }

  async findByToken(token: string) {
    const cacheKey = eventTokenCacheKey(token);
    const cached = await this.cache.get<Awaited<ReturnType<typeof this.prisma.event.findFirst>>>(
      cacheKey,
    );
    if (cached) return cached;

    const event = await this.prisma.event.findFirst({
      where: { token, deletedAt: null },
    });
    if (!event) throw new NotFoundException("Event not found");

    await this.cache.set(cacheKey, event, EVENT_TOKEN_CACHE_TTL_SECONDS);
    return event;
  }

  async update(id: string, dto: UpdateEventDto) {
    const existing = await this.findOne(id);

    const maxStorageBytes = dto.maxStorageGb
      ? BigInt(dto.maxStorageGb) * BigInt(1024 * 1024 * 1024)
      : undefined;

    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.eventDate !== undefined && {
          eventDate: dto.eventDate ? new Date(dto.eventDate) : null,
        }),
        ...(dto.expiresAt && { expiresAt: new Date(dto.expiresAt) }),
        ...(dto.expirationMode && { expirationMode: dto.expirationMode }),
        ...(dto.allowUploads !== undefined && { allowUploads: dto.allowUploads }),
        ...(dto.maxUploads !== undefined && { maxUploads: dto.maxUploads }),
        ...(maxStorageBytes !== undefined && { maxStorageBytes }),
      },
    });
    await this.cache.del(eventTokenCacheKey(existing.token));
    return updated;
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    const removed = await this.prisma.event.update({
      where: { id },
      data: { deletedAt: new Date(), status: EventStatus.DELETED },
    });
    await this.cache.del(eventTokenCacheKey(existing.token));
    return removed;
  }

  async getStats() {
    const cached = await this.cache.get<{
      eventsCount: number;
      imagesCount: number;
      videosCount: number;
      storageBytes: string | bigint;
    }>(STATS_CACHE_KEY);
    if (cached) return cached;

    const [eventsCount, imagesCount, videosCount, storageResult] =
      await Promise.all([
        this.prisma.event.count({ where: { deletedAt: null } }),
        this.prisma.media.count({
          where: { deletedAt: null, type: "IMAGE" },
        }),
        this.prisma.media.count({
          where: { deletedAt: null, type: "VIDEO" },
        }),
        this.prisma.media.aggregate({
          where: { deletedAt: null },
          _sum: { size: true },
        }),
      ]);

    const stats = {
      eventsCount,
      imagesCount,
      videosCount,
      storageBytes: storageResult._sum.size ?? BigInt(0),
    };
    await this.cache.set(STATS_CACHE_KEY, stats, STATS_CACHE_TTL_SECONDS);
    return stats;
  }

  isExpired(event: { expiresAt: Date }) {
    return event.expiresAt < new Date();
  }
}
