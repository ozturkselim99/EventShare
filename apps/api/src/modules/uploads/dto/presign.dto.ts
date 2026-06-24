import {
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/quicktime",
  "video/x-m4v",
] as const;

export class PresignDto {
  @ApiProperty({ example: "photo.jpg" })
  @IsString()
  @MaxLength(255)
  filename: string;

  @ApiProperty({ example: "image/jpeg", enum: ALLOWED_MIME_TYPES })
  @IsIn(ALLOWED_MIME_TYPES)
  mimeType: string;

  @ApiProperty({ example: 8421931 })
  @IsInt()
  @IsPositive()
  size: number;

  @ApiPropertyOptional({ example: "John" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  uploadedBy?: string;
}
