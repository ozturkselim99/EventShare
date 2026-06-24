import { Injectable, Logger } from "@nestjs/common";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { ConfigService } from "@nestjs/config";
import * as sharp from "sharp";
import { Readable } from "stream";

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>("R2_BUCKET") ?? "eventshare-media";
    this.publicBaseUrl = config.get<string>("R2_PUBLIC_BASE_URL") ?? "";

    this.s3 = new S3Client({
      region: "auto",
      endpoint: config.get<string>("R2_ENDPOINT"),
      credentials: {
        accessKeyId: config.get<string>("R2_ACCESS_KEY_ID")!,
        secretAccessKey: config.get<string>("R2_SECRET_ACCESS_KEY")!,
      },
    });
  }

  async process(storageKey: string, eventId: string, mediaId: string) {
    this.logger.log(`Processing image: ${storageKey}`);

    const originalBytes = await this.download(storageKey);

    const image = sharp(originalBytes).rotate();

    const metadata = await image.metadata();

    const stripped = await image
      .withMetadata({ exif: {} })
      .toBuffer();

    const [thumbnailBuffer, optimizedBuffer] = await Promise.all([
      sharp(stripped)
        .resize(480, undefined, { withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer(),
      sharp(stripped)
        .resize(1920, undefined, { withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer(),
    ]);

    const thumbKey = `events/${eventId}/variants/${mediaId}/thumbnail.webp`;
    const optimKey = `events/${eventId}/variants/${mediaId}/optimized.webp`;

    await Promise.all([
      this.upload(thumbKey, thumbnailBuffer, "image/webp"),
      this.upload(optimKey, optimizedBuffer, "image/webp"),
    ]);

    return {
      thumbnailKey: thumbKey,
      thumbnailUrl: this.publicUrl(thumbKey),
      originalUrl: this.publicUrl(storageKey),
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      variants: [
        { key: thumbKey, kind: "THUMBNAIL" as const, size: BigInt(thumbnailBuffer.length) },
        { key: optimKey, kind: "OPTIMIZED" as const, size: BigInt(optimizedBuffer.length) },
      ],
    };
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
