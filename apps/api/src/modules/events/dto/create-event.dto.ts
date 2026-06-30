import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ExpirationMode } from "@eventshare/shared";

export class CreateEventDto {
  @ApiProperty({ example: "Ayşe & Ali Wedding" })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @ApiProperty({ example: "2025-12-31T23:59:59Z" })
  @IsDateString()
  expiresAt: string;

  @ApiPropertyOptional({ enum: ExpirationMode, default: ExpirationMode.VIEW_ONLY })
  @IsOptional()
  @IsEnum(ExpirationMode)
  expirationMode?: ExpirationMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  maxUploads?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  maxStorageGb?: number;
}
