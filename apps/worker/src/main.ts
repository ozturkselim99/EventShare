import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./worker.module";

async function bootstrap() {
  const app = await NestFactory.create(WorkerModule, { logger: ["error", "warn", "log"] });
  await app.init();
  console.log("EventShare Worker started");
}

bootstrap();
