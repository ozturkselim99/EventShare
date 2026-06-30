import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { validateR2Env } from "@eventshare/shared";

@Injectable()
export class StorageConfigValidator implements OnModuleInit {
  private readonly logger = new Logger(StorageConfigValidator.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const provider = this.config.get<string>("storage.provider") ?? "local";
    if (provider !== "r2") {
      this.logger.log(`Storage provider: ${provider}`);
      return;
    }

    const missing = validateR2Env({
      R2_ACCOUNT_ID: this.config.get<string>("storage.r2.accountId"),
      R2_ACCESS_KEY_ID: this.config.get<string>("storage.r2.accessKeyId"),
      R2_SECRET_ACCESS_KEY: this.config.get<string>("storage.r2.secretAccessKey"),
      R2_BUCKET: this.config.get<string>("storage.r2.bucket"),
      R2_PUBLIC_BASE_URL: this.config.get<string>("storage.r2.publicBaseUrl"),
      R2_ENDPOINT: this.config.get<string>("storage.r2.endpoint"),
    });

    if (missing.length > 0) {
      throw new Error(
        `STORAGE_PROVIDER=r2 but required R2 configuration is missing: ${missing.join(", ")}. ` +
          "See docs/r2-setup.md and .env.example.",
      );
    }

    this.logger.log(
      `Storage provider: r2 (bucket=${this.config.get<string>("storage.r2.bucket")})`,
    );
  }
}
