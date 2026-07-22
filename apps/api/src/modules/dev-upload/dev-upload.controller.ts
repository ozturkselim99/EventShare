import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Put,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { createReadStream, existsSync } from "fs";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname, resolve, sep } from "path";
import { lookup } from "mime-types";
import { DEV_UPLOADS_DIR } from "../storage/providers/local.provider";

// Must match the storage key shape generated in uploads.service.ts's presign()
// (events/<eventId>/original/<hex>.<ext>) — rejects anything else, including
// path traversal attempts (`..`) or arbitrary keys.
const SAFE_KEY_PATTERN =
  /^events\/[0-9a-f-]{36}\/(original|thumbnail|preview|variant)\/[0-9a-f]{8,}\.[a-zA-Z0-9]{1,10}$/;

function resolveSafePath(key: string): string {
  if (!SAFE_KEY_PATTERN.test(key)) {
    throw new BadRequestException("Invalid storage key");
  }
  const filePath = resolve(join(DEV_UPLOADS_DIR, key));
  const root = resolve(DEV_UPLOADS_DIR);
  if (filePath !== root && !filePath.startsWith(root + sep)) {
    throw new BadRequestException("Invalid storage key");
  }
  return filePath;
}

@Controller("dev-upload")
export class DevUploadController {
  @Put("put")
  async put(
    @Query("key") key: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const filePath = resolveSafePath(key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, req.body as Buffer);
    res.status(200).end();
  }

  @Get("file")
  file(@Query("key") key: string, @Res() res: Response) {
    const filePath = resolveSafePath(key);
    if (!existsSync(filePath)) {
      throw new NotFoundException("File not found");
    }
    const mimeType =
      (lookup(key) as string | false) || "application/octet-stream";
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    createReadStream(filePath).pipe(res);
  }
}
