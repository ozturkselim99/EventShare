import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { LoggerModule } from "nestjs-pino";
import { randomUUID } from "crypto";
import { AuthModule } from "./modules/auth/auth.module";
import { EventsModule } from "./modules/events/events.module";
import { MediaModule } from "./modules/media/media.module";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { StorageModule } from "./modules/storage/storage.module";
import { QrModule } from "./modules/qr/qr.module";
import { HealthModule } from "./modules/health/health.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { DevUploadModule } from "./modules/dev-upload/dev-upload.module";
import { CacheModule } from "./modules/cache/cache.module";
import { MaintenanceModule } from "./modules/maintenance/maintenance.module";
import appConfig from "./config/app.config";
import storageConfig from "./config/storage.config";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, storageConfig],
      envFilePath: [".env"],
    }),

    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? "info",
        genReqId: (req) => req.headers["x-request-id"] ?? randomUUID(),
        redact: ["req.headers.authorization", "req.headers.cookie"],
        transport:
          process.env.NODE_ENV === "production"
            ? undefined
            : { target: "pino-pretty", options: { singleLine: true } },
      },
    }),

    ScheduleModule.forRoot(),

    // Rate limiting is keyed by IP, and venue WiFi commonly NATs hundreds of
    // guests behind one public IP — a load test simulating 150 concurrent
    // guests behind a single IP hit 90% 429s at the old limit of 300/60s.
    // This ceiling exists to stop genuine abuse (scripted floods), not to
    // cap legitimate shared-IP burst traffic, so it's set high and left
    // tunable per deployment. Specific routes (login, uploads) still
    // tighten this via @Throttle() overrides.
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60_000,
        limit: Number(process.env.THROTTLE_DEFAULT_LIMIT ?? 20_000),
      },
    ]),

    PrismaModule,
    CacheModule,
    StorageModule,
    AuthModule,
    EventsModule,
    MediaModule,
    UploadsModule,
    QrModule,
    HealthModule,
    MaintenanceModule,
    // Dev-only: local file upload/serve endpoint (active when STORAGE_PROVIDER=local)
    ...(process.env.STORAGE_PROVIDER === "local" ? [DevUploadModule] : []),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
