import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { STORAGE_PROVIDER } from "./storage.interface";
import { R2StorageProvider } from "./providers/r2.provider";
import { LocalStorageProvider } from "./providers/local.provider";

@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const provider = config.get<string>("storage.provider") ?? "r2";

        if (provider === "local") {
          return new LocalStorageProvider();
        }

        if (provider === "r2") {
          return new R2StorageProvider(
            config.get<string>("storage.r2.bucket")!,
            config.get<string>("storage.r2.publicBaseUrl")!,
            config.get<string>("storage.r2.endpoint")!,
            config.get<string>("storage.r2.accessKeyId")!,
            config.get<string>("storage.r2.secretAccessKey")!,
          );
        }

        throw new Error(`Unsupported storage provider: ${provider}`);
      },
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
