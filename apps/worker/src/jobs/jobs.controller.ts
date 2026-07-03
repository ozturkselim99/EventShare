import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from "@nestjs/common";
import { MediaProcessingService } from "../services/media-processing.service";
import { QstashSignatureGuard } from "./qstash-signature.guard";
import { JobName, type MediaJobMessage } from "@eventshare/shared";

@Controller()
export class JobsController {
  constructor(private readonly media: MediaProcessingService) {}

  @Get("health")
  health() {
    return { status: "ok" };
  }

  @Post("jobs/media")
  @HttpCode(200)
  @UseGuards(QstashSignatureGuard)
  async handleMedia(@Body() body: MediaJobMessage) {
    const { jobName, ...data } = body;
    await this.media.process(jobName as JobName, data);
    return { ok: true };
  }
}
