import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
  Res,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import type { Response } from "express";
import { MediaService } from "./media.service";
import { EventsService } from "../events/events.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { QueryAdminMediaDto, QueryMediaDto } from "./dto/query-media.dto";
import { ZipArchive } from "archiver";
import { join } from "path";
import { tmpdir } from "os";
import { access } from "fs/promises";
import { STORAGE_PROVIDER, StorageProvider } from "../storage/storage.interface";

@ApiTags("admin/media")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("admin")
export class AdminMediaController {
  constructor(
    private readonly media: MediaService,
    private readonly config: ConfigService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  @Get("events/:eventId/media")
  @ApiOperation({ summary: "List all media for event (admin)" })
  findAll(
    @Param("eventId") eventId: string,
    @Query() query: QueryAdminMediaDto,
  ) {
    return this.media.findAdminByEvent(eventId, query);
  }

  @Delete("media/:mediaId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Soft-delete media item" })
  remove(@Param("mediaId") mediaId: string) {
    return this.media.softDelete(mediaId);
  }

  @Post("media/:mediaId/reprocess")
  @ApiOperation({ summary: "Re-queue media for processing" })
  reprocess(@Param("mediaId") mediaId: string) {
    return this.media.reprocess(mediaId);
  }

  @Get("events/:eventId/download")
  @ApiOperation({ summary: "Download all media as zip" })
  async downloadAll(
    @Param("eventId") eventId: string,
    @Res() res: Response,
  ) {
    const { event, mediaList } = await this.media.getAllMediaForDownload(eventId);

    if (mediaList.length === 0) {
      res.status(404).json({ message: "No media found" });
      return;
    }

    const archive = new ZipArchive({ zlib: { level: 9 } });

    const storageProvider = this.config.get<string>("storage.provider") ?? "local";
    const DEV_UPLOADS_DIR =
      process.env.DEV_UPLOADS_DIR ?? join(tmpdir(), "eventshare-dev");

    res.set({
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${event.name.replace(/[^a-z0-9]/gi, "_")}_medya.zip"`,
    });

    archive.pipe(res);

    let addedCount = 0;
    
    if (storageProvider === "local") {
      // Local storage: read from filesystem
      for (const media of mediaList) {
        const filePath = join(DEV_UPLOADS_DIR, media.storageKey);
        try {
          await access(filePath);
          const fileName = media.storageKey.split("/").pop() || `media_${media.id}`;
          archive.file(filePath, { name: fileName });
          addedCount++;
        } catch {
          // File not found, skip
        }
      }
    } else {
      // Cloud storage (R2): fetch via presigned URLs
      for (const media of mediaList) {
        try {
          const url = await this.storage.createPresignedGetUrl({
            key: media.storageKey,
            ttlSeconds: 300,
          });
          
          const response = await fetch(url);
          if (!response.ok) {
            continue; // Skip if fetch fails
          }
          
          const buffer = await response.arrayBuffer();
          const fileName = media.storageKey.split("/").pop() || `media_${media.id}`;
          archive.append(Buffer.from(buffer), { name: fileName });
          addedCount++;
        } catch {
          // File fetch failed, skip
        }
      }
    }

    if (addedCount === 0) {
      archive.abort();
      res.status(404).json({ message: "No media files found" });
      return;
    }

    await archive.finalize();
  }
}

@ApiTags("media")
@Controller("events/by-token/:token/media")
export class PublicMediaController {
  constructor(
    private readonly media: MediaService,
    private readonly events: EventsService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Gallery cursor pagination (public)" })
  async findByEvent(@Param("token") token: string, @Query() query: QueryMediaDto) {
    // Resolve eventId from the QR token server-side — never trust a
    // client-supplied eventId, or any token holder could read any event's gallery.
    const event = await this.events.findByToken(token);
    return this.media.findByEvent(event.id, query);
  }
}

@ApiTags("media")
@Controller("media")
export class MediaDownloadController {
  constructor(private readonly media: MediaService) {}

  @Get(":mediaId/download")
  @ApiOperation({ summary: "Generate download URL for media" })
  download(@Param("mediaId") mediaId: string) {
    return this.media.getDownloadUrl(mediaId);
  }
}
