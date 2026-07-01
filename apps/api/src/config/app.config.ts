import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
  publicUrl: process.env.APP_PUBLIC_URL ?? "http://localhost:3000",
  apiPort: parseInt(process.env.API_PORT ?? "3001", 10),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? "dev_access_secret",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev_refresh_secret",
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  maxImageSizeMb: parseInt(process.env.MAX_IMAGE_SIZE_MB ?? "50", 10),
  maxVideoSizeMb: parseInt(process.env.MAX_VIDEO_SIZE_MB ?? "500", 10),
  presignedUrlTtlSeconds: parseInt(
    process.env.PRESIGNED_URL_TTL_SECONDS ?? "600",
    10,
  ),
  qstash: {
    token: process.env.QSTASH_TOKEN ?? "",
    url: process.env.QSTASH_URL ?? "",
    workerUrl: process.env.WORKER_PUBLIC_URL ?? "http://localhost:3002",
  },
}));
