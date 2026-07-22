import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Min, Max, IsIn } from "class-validator";

export class QueryMediaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 40 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 40;

  @ApiPropertyOptional({ enum: ["IMAGE", "VIDEO"] })
  @IsOptional()
  @IsIn(["IMAGE", "VIDEO"])
  type?: string;

  @ApiPropertyOptional({ enum: ["oldest", "newest"] })
  @IsOptional()
  @IsIn(["oldest", "newest"])
  sort?: string;
}

export class QueryAdminMediaDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 40 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 40;
}
