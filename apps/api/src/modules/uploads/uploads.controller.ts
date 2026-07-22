import { Body, Controller, Ip, Post, Param, Headers } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { UploadsService } from "./uploads.service";
import { PresignDto } from "./dto/presign.dto";
import { CompleteUploadDto } from "./dto/complete-upload.dto";

// Same shared-IP reasoning as the global default (see app.module.ts): a
// venue full of guests uploading behind one NAT'd IP needs real headroom.
// Still meaningfully tighter than the global default since uploads carry
// real storage/processing cost.
@ApiTags("uploads")
@Controller("events/by-token/:token/uploads")
@Throttle({ default: { limit: Number(process.env.THROTTLE_UPLOAD_LIMIT ?? 1200), ttl: 60_000 } })
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post("presign")
  @ApiOperation({ summary: "Request presigned upload URL" })
  presign(
    @Param("token") token: string,
    @Body() dto: PresignDto,
    @Ip() ip: string,
    @Headers("user-agent") userAgent: string,
  ) {
    return this.uploads.presign(token, dto, ip, userAgent);
  }

  @Post("complete")
  @ApiOperation({ summary: "Confirm upload and enqueue processing" })
  complete(
    @Param("token") token: string,
    @Body() dto: CompleteUploadDto,
  ) {
    return this.uploads.complete(token, dto);
  }
}
