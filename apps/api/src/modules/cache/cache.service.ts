import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "@upstash/redis";

// Thin wrapper around Upstash Redis (REST-based, same vendor as QStash — no
// TCP pool to manage). Falls back to a no-op cache when the env vars aren't
// set, so local dev works without provisioning Redis.
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis | null;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>("app.redis.url");
    const token = this.config.get<string>("app.redis.token");
    this.client = url && token ? new Redis({ url, token }) : null;
    if (!this.client) {
      this.logger.warn("UPSTASH_REDIS_REST_URL/TOKEN not set — caching disabled");
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      return await this.client.get<T>(key);
    } catch (error) {
      this.logger.warn(`Cache get failed for ${key}: ${error}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(key, value, { ex: ttlSeconds });
    } catch (error) {
      this.logger.warn(`Cache set failed for ${key}: ${error}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.warn(`Cache del failed for ${key}: ${error}`);
    }
  }
}
