import { Injectable } from "@nestjs/common";
import {
  S3Client,
  DeleteObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  StorageProvider,
  PresignPutInput,
  PresignPutResult,
  PresignGetInput,
} from "../storage.interface";

@Injectable()
export class R2StorageProvider implements StorageProvider {
  private readonly client: S3Client;

  constructor(
    private readonly bucket: string,
    private readonly publicBaseUrl: string,
    endpoint: string,
    accessKeyId: string,
    secretAccessKey: string,
  ) {
    this.client = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async createPresignedPutUrl(input: PresignPutInput): Promise<PresignPutResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      ContentType: input.mimeType,
      ContentLength: input.size,
    });

    const url = await getSignedUrl(this.client, command, {
      expiresIn: input.ttlSeconds,
    });

    return { url, headers: { "Content-Type": input.mimeType } };
  }

  async createPresignedGetUrl(input: PresignGetInput): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
    });
    return getSignedUrl(this.client, command, {
      expiresIn: input.ttlSeconds ?? 3600,
    });
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  getPublicUrl(key: string): string {
    return `${this.publicBaseUrl.replace(/\/$/, "")}/${key}`;
  }
}
