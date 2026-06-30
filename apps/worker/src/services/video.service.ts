import { Injectable, Logger } from "@nestjs/common";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { ConfigService } from "@nestjs/config";
import { resolveR2Endpoint } from "@eventshare/shared";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, rm, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { Readable } from "stream";

const exec = promisify(execFile);

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>("R2_BUCKET") ?? "eventshare-media";
    this.publicBaseUrl = config.get<string>("R2_PUBLIC_BASE_URL") ?? "";

    this.s3 = new S3Client({
      region: "auto",
      endpoint: resolveR2Endpoint(
        config.get<string>("R2_ACCOUNT_ID"),
        config.get<string>("R2_ENDPOINT"),
      ),
      credentials: {
        accessKeyId: config.get<string>("R2_ACCESS_KEY_ID")!,
        secretAccessKey: config.get<string>("R2_SECRET_ACCESS_KEY")!,
      },
    });
  }

  async process(storageKey: string, eventId: string, mediaId: string) {
    this.logger.log(`Processing video: ${storageKey}`);

    const tmpDir = join(tmpdir(), `eventshare-${randomBytes(6).toString("hex")}`);
    await mkdir(tmpDir, { recursive: true });

    const videoPath = join(tmpDir, "input.mp4");
    const previewPath = join(tmpDir, "preview.jpg");

    try {
      const videoBytes = await this.download(storageKey);
      await writeFile(videoPath, videoBytes);

      let durationSeconds: number | null = null;
      let width: number | null = null;
      let height: number | null = null;

      try {
        const { stdout } = await exec("ffprobe", [
          "-v", "quiet",
          "-print_format", "json",
          "-show_streams",
          videoPath,
        ]);
        const probe = JSON.parse(stdout) as {
          streams: Array<{ codec_type: string; width?: number; height?: number; duration?: string }>;
        };
        const videoStream = probe.streams.find((s) => s.codec_type === "video");
        if (videoStream) {
          width = videoStream.width ?? null;
          height = videoStream.height ?? null;
          durationSeconds = videoStream.duration
            ? Math.round(parseFloat(videoStream.duration))
            : null;
        }
      } catch {
        this.logger.warn("ffprobe not available, skipping metadata extraction");
      }

      let previewKey: string | null = null;
      let previewUrl: string | null = null;

      try {
        await exec("ffmpeg", [
          "-i", videoPath,
          "-ss", "00:00:01",
          "-vframes", "1",
          "-q:v", "3",
          previewPath,
        ]);
        const previewBuffer = await readFile(previewPath);
        previewKey = `events/${eventId}/variants/${mediaId}/preview.jpg`;
        await this.upload(previewKey, previewBuffer, "image/jpeg");
        previewUrl = this.publicUrl(previewKey);
      } catch {
        this.logger.warn("ffmpeg not available, skipping preview generation");
      }

      return {
        previewKey,
        previewUrl,
        thumbnailUrl: previewUrl,
        originalUrl: this.publicUrl(storageKey),
        width,
        height,
        durationSeconds,
      };
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  }

  private async download(key: string): Promise<Buffer> {
    const { Body } = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!Body) throw new Error(`Empty body for key: ${key}`);
    const chunks: Uint8Array[] = [];
    for await (const chunk of Body as Readable) {
      chunks.push(chunk as Uint8Array);
    }
    return Buffer.concat(chunks);
  }

  private async upload(key: string, data: Buffer, contentType: string) {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  }

  private publicUrl(key: string): string {
    return `${this.publicBaseUrl.replace(/\/$/, "")}/${key}`;
  }
}
