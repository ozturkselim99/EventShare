import { NestFactory } from "@nestjs/core";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as express from "express";
import { AppModule } from "./app.module";

// Fix BigInt serialization for JSON.stringify
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log"],
    // Disable built-in body parser so we can apply raw body for dev-upload PUT
    bodyParser: false,
  });

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
