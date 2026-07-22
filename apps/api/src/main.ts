import { NestFactory } from "@nestjs/core";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import * as express from "express";
import helmet from "helmet";
import type { Request, Response, NextFunction } from "express";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/http-exception.filter";

// Fix BigInt serialization for JSON.stringify
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

// Refuse to boot with the unauthenticated local dev-storage endpoint in
// production — it accepts arbitrary file writes under STORAGE_PROVIDER=local.
if (process.env.NODE_ENV === "production" && process.env.STORAGE_PROVIDER === "local") {
  throw new Error(
    "STORAGE_PROVIDER=local is not allowed in production (unauthenticated dev-upload endpoint). Use STORAGE_PROVIDER=r2.",
  );
}

const REQUEST_TIMEOUT_MS = 30_000;

function requestTimeout(req: Request, res: Response, next: NextFunction) {
  req.setTimeout(REQUEST_TIMEOUT_MS, () => {
    if (!res.headersSent) {
      res.status(503).json({
        statusCode: 503,
        message: "Request timed out",
        timestamp: new Date().toISOString(),
        path: req.url,
      });
    }
  });
  next();
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    // Disable built-in body parser so we can apply raw body for dev-upload PUT
    bodyParser: false,
  });
  app.useLogger(app.get(Logger));

  // Helmet's default Cross-Origin-Resource-Policy is "same-origin", which
  // silently blocks <img> tags on the web app (a different origin/port)
  // from loading media served by this API (e.g. the local dev-upload
  // file endpoint) — the browser drops the image with no visible error.
  // This API intentionally serves publicly embeddable media.
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(requestTimeout);

  // Raw binary body for direct file uploads (local dev storage)
  app.use(
    /\/api\/v1\/dev-upload\/put/,
    express.raw({ type: "*/*", limit: "600mb" }),
  );
  // Standard parsers for everything else
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  app.enableCors({
    origin: process.env.APP_PUBLIC_URL ?? "http://localhost:3000",
    credentials: true,
  });

  app.setGlobalPrefix("api");

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle("EventShare API")
    .setDescription("EventShare production API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.API_PORT ?? 3001;
  await app.listen(port);
  console.log(`EventShare API listening on http://localhost:${port}`);
}

bootstrap();
