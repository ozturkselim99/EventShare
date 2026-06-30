import { Body, Controller, Ip, Post, Param, Headers } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { UploadsService } from "./uploads.service";
import { PresignDto } from "./dto/presign.dto";
import { CompleteUploadDto } from "./dto/complete-upload.dto";

@ApiTags("uploads")
@Controller("events/by-token/:token/uploads")
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
