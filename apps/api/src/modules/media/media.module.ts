import { Module } from "@nestjs/common";
import { MediaService } from "./media.service";
import {
  AdminMediaController,
  PublicMediaController,
  MediaDownloadController,
} from "./media.controller";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [StorageModule],
  providers: [MediaService],
  controllers: [AdminMediaController, PublicMediaController, MediaDownloadController],
})
export class MediaModule {}
