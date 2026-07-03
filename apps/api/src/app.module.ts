import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./modules/auth/auth.module";
import { EventsModule } from "./modules/events/events.module";
import { MediaModule } from "./modules/media/media.module";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { StorageModule } from "./modules/storage/storage.module";
import { QrModule } from "./modules/qr/qr.module";
import { HealthModule } from "./modules/health/health.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { DevUploadModule } from "./modules/dev-upload/dev-upload.module";
import appConfig from "./config/app.config";
import storageConfig from "./config/storage.config";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, storageConfig],
      envFilePath: [".env"],
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),

    PrismaModule,
    StorageModule,
    AuthModule,
    EventsModule,
    MediaModule,
    UploadsModule,
    QrModule,
    HealthModule,
    // Dev-only: local file upload/serve endpoint (active when STORAGE_PROVIDER=local)
    ...(process.env.STORAGE_PROVIDER === "local" ? [DevUploadModule] : []),
  ],
})
export class AppModule {}
