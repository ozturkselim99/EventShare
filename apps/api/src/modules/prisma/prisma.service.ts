import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX_API ?? 20),
  statement_timeout: 10_000,
  query_timeout: 10_000,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
});

const SLOW_QUERY_THRESHOLD_MS = Number(process.env.SLOW_QUERY_THRESHOLD_MS ?? 200);

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const adapter = new PrismaPg(pool);
    super({ adapter, log: [{ emit: "event", level: "query" }] } as any);
  }

  async onModuleInit() {
    await this.$connect();
    (this as any).$on("query", (e: { query: string; duration: number; params: string }) => {
      if (e.duration > SLOW_QUERY_THRESHOLD_MS) {
        this.logger.warn(`Slow query (${e.duration}ms): ${e.query} -- params: ${e.params}`);
      }
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await pool.end();
  }
}
