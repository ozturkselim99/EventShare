import {
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
import { join, dirname } from "path";
import { lookup } from "mime-types";
import { DEV_UPLOADS_DIR } from "../storage/providers/local.provider";

@Controller("dev-upload")
export class DevUploadController {
  @Put("put")
  async put(
    @Query("key") key: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const filePath = join(DEV_UPLOADS_DIR, key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, req.body as Buffer);
    res.status(200).end();
  }

  @Get("file")
  file(@Query("key") key: string, @Res() res: Response) {
    const filePath = join(DEV_UPLOADS_DIR, key);
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
