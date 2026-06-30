import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { validateR2Env } from "@eventshare/shared";

@Injectable()
export class WorkerStorageConfigValidator implements OnModuleInit {
  private readonly logger = new Logger(WorkerStorageConfigValidator.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const provider = this.config.get<string>("STORAGE_PROVIDER") ?? "local";
    if (provider !== "r2") {
      this.logger.log(`Worker storage mode: ${provider}`);
      return;
    }

    const missing = validateR2Env({
      R2_ACCOUNT_ID: this.config.get<string>("R2_ACCOUNT_ID"),
      R2_ACCESS_KEY_ID: this.config.get<string>("R2_ACCESS_KEY_ID"),
      R2_SECRET_ACCESS_KEY: this.config.get<string>("R2_SECRET_ACCESS_KEY"),
      R2_BUCKET: this.config.get<string>("R2_BUCKET"),
      R2_PUBLIC_BASE_URL: this.config.get<string>("R2_PUBLIC_BASE_URL"),
      R2_ENDPOINT: this.config.get<string>("R2_ENDPOINT"),
    });

    if (missing.length > 0) {
      throw new Error(
        `STORAGE_PROVIDER=r2 but worker is missing R2 configuration: ${missing.join(", ")}. ` +
          "See docs/r2-setup.md.",
      );
    }

    this.logger.log(`Worker storage mode: r2 (bucket=${this.config.get("R2_BUCKET")})`);
  }
}
