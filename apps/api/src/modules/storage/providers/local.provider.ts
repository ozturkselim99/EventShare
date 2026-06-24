import { Injectable } from "@nestjs/common";
import { mkdir, unlink, access } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import type {
  StorageProvider,
  PresignPutInput,
  PresignPutResult,
  PresignGetInput,
} from "../storage.interface";

export const DEV_UPLOADS_DIR =
  process.env.DEV_UPLOADS_DIR ?? join(tmpdir(), "eventshare-dev");

const API_URL = `http://localhost:${process.env.API_PORT ?? "3001"}`;

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  async createPresignedPutUrl(input: PresignPutInput): Promise<PresignPutResult> {
    const dir = join(DEV_UPLOADS_DIR, ...input.key.split("/").slice(0, -1));
    await mkdir(dir, { recursive: true });

    return {
      url: `${API_URL}/api/v1/dev-upload/put?key=${encodeURIComponent(input.key)}`,
      headers: { "Content-Type": input.mimeType },
    };
  }

  async createPresignedGetUrl(input: PresignGetInput): Promise<string> {
    return this.getPublicUrl(input.key);
  }

  async deleteObject(key: string): Promise<void> {
    const filePath = join(DEV_UPLOADS_DIR, key);
    try {
      await access(filePath);
      await unlink(filePath);
    } catch {
      // file may not exist, ignore
    }
  }

  getPublicUrl(key: string): string {
    return `${API_URL}/api/v1/dev-upload/file?key=${encodeURIComponent(key)}`;
  }
}
