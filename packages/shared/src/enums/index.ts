export enum EventStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  EXPIRED = "EXPIRED",
  ARCHIVED = "ARCHIVED",
  DELETED = "DELETED",
}

export enum ExpirationMode {
  VIEW_ONLY = "VIEW_ONLY",
  CLOSED = "CLOSED",
  ARCHIVE = "ARCHIVE",
}

export enum MediaType {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
}

export enum MediaStatus {
  PENDING_UPLOAD = "PENDING_UPLOAD",
  UPLOADED = "UPLOADED",
  PROCESSING = "PROCESSING",
  READY = "READY",
  FAILED = "FAILED",
  DELETED = "DELETED",
}

export enum MediaVariantKind {
  THUMBNAIL = "THUMBNAIL",
  OPTIMIZED = "OPTIMIZED",
  VIDEO_PREVIEW = "VIDEO_PREVIEW",
}

export enum JobName {
  PROCESS_IMAGE = "process-image",
  PROCESS_VIDEO = "process-video",
  SCAN_MEDIA = "scan-media",
  EXPIRE_EVENTS = "expire-events",
  CLEANUP_ORPHANS = "cleanup-orphans",
}
