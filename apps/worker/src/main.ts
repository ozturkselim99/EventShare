import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./worker.module";

async function bootstrap() {
  const app = await NestFactory.create(WorkerModule, {
    logger: ["error", "warn", "log"],
    rawBody: true,
  });

  const port = process.env.WORKER_PORT ?? 3002;
  await app.listen(port);
  console.log(`EventShare Worker listening on http://localhost:${port}`);
}

bootstrap();
