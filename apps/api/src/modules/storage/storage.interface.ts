export interface PresignPutInput {
  key: string;
  mimeType: string;
  size: number;
  ttlSeconds: number;
}

export interface PresignPutResult {
  url: string;
  headers: Record<string, string>;
}

export interface PresignGetInput {
  key: string;
  ttlSeconds?: number;
}

export interface StorageProvider {
  createPresignedPutUrl(input: PresignPutInput): Promise<PresignPutResult>;
  createPresignedGetUrl(input: PresignGetInput): Promise<string>;
  deleteObject(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}

export const STORAGE_PROVIDER = Symbol("STORAGE_PROVIDER");
