import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import type { CreateEventDto } from "./dto/create-event.dto";
import type { UpdateEventDto } from "./dto/update-event.dto";
import { EventStatus, ExpirationMode } from "@eventshare/shared";
import { randomBytes } from "crypto";

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
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
    const event = await this.prisma.event.findFirst({
      where: { token, deletedAt: null },
    });
    if (!event) throw new NotFoundException("Event not found");
    return event;
  }

  async update(id: string, dto: UpdateEventDto) {
    await this.findOne(id);

    const maxStorageBytes = dto.maxStorageGb
      ? BigInt(dto.maxStorageGb) * BigInt(1024 * 1024 * 1024)
      : undefined;

    return this.prisma.event.update({
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
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.event.update({
      where: { id },
      data: { deletedAt: new Date(), status: EventStatus.DELETED },
    });
  }

  async getStats() {
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

    return {
      eventsCount,
      imagesCount,
      videosCount,
      storageBytes: storageResult._sum.size ?? BigInt(0),
    };
  }

  isExpired(event: { expiresAt: Date }) {
    return event.expiresAt < new Date();
  }
}
