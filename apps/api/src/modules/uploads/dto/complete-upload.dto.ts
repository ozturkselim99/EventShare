import { IsOptional, IsString, IsUUID } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CompleteUploadDto {
  @ApiProperty()
  @IsUUID()
  mediaId: string;

  @ApiProperty()
  @IsString()
  uploadToken: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checksumSha256?: string;
}
