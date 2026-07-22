import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import { WorkerModule } from "./worker.module";
import { WorkerExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(WorkerModule, {
    bufferLogs: true,
    rawBody: true,
  });
  app.useLogger(app.get(Logger));

  app.useGlobalFilters(new WorkerExceptionFilter());
  app.enableShutdownHooks();

  const port = process.env.WORKER_PORT ?? 3002;
  await app.listen(port);
  console.log(`EventShare Worker listening on http://localhost:${port}`);
}

bootstrap();
