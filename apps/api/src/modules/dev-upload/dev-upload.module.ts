import { Module } from "@nestjs/common";
import { DevUploadController } from "./dev-upload.controller";

@Module({
  controllers: [DevUploadController],
})
export class DevUploadModule {}
