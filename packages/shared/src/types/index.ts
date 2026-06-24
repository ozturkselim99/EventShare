export interface ProcessMediaJobData {
  mediaId: string;
  eventId: string;
  storageKey: string;
  mimeType: string;
  type: "IMAGE" | "VIDEO";
}

export interface ScanMediaJobData {
  mediaId: string;
  storageKey: string;
}

export interface CursorPage<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

export interface PublicEventDto {
  id: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  eventDate: string | null;
  expiresAt: string;
  allowUploads: boolean;
  status: string;
  isExpired: boolean;
}

export interface PublicMediaDto {
  id: string;
  type: string;
  thumbnailUrl: string | null;
  originalUrl: string | null;
  uploadedBy: string | null;
  createdAt: string;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
}
