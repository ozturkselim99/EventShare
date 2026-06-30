import { PartialType } from "@nestjs/swagger";
import { CreateEventDto } from "./create-event.dto";
import { IsBoolean, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateEventDto extends PartialType(CreateEventDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowUploads?: boolean;
}
