import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { EventsService } from "./events.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { EventStatus } from "@eventshare/shared";

@ApiTags("admin/events")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("admin/events")
export class AdminEventsController {
  constructor(private readonly events: EventsService) {}

  @Get("stats")
  @ApiOperation({ summary: "Dashboard statistics" })
  stats() {
    return this.events.getStats();
  }

  @Get()
  @ApiOperation({ summary: "List events with search and pagination" })
  findAll(
    @Query("search") search?: string,
    @Query("status") status?: EventStatus,
    @Query("page") page = 1,
    @Query("limit") limit = 20,
  ) {
    return this.events.findAll({ search, status, page, limit });
  }

  @Post()
  @ApiOperation({ summary: "Create event" })
  create(@Body() dto: CreateEventDto) {
    return this.events.create(dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get event details" })
  findOne(@Param("id") id: string) {
    return this.events.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update event" })
  update(@Param("id") id: string, @Body() dto: UpdateEventDto) {
    return this.events.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Soft-delete event" })
  remove(@Param("id") id: string) {
    return this.events.remove(id);
  }

  @Post(":id/disable-uploads")
  @ApiOperation({ summary: "Disable uploads for event" })
  disableUploads(@Param("id") id: string) {
    return this.events.update(id, { allowUploads: false });
  }

  @Post(":id/enable-uploads")
  @ApiOperation({ summary: "Enable uploads for event" })
  enableUploads(@Param("id") id: string) {
    return this.events.update(id, { allowUploads: true });
  }

  @Post(":id/extend")
  @ApiOperation({ summary: "Extend event expiration date" })
  extend(@Param("id") id: string, @Body() dto: { expiresAt: string }) {
    return this.events.update(id, { expiresAt: dto.expiresAt });
  }
}

@ApiTags("events")
@Controller("events")
export class PublicEventsController {
  constructor(private readonly events: EventsService) {}

  @Get("by-token/:token")
  @ApiOperation({ summary: "Get public event by token" })
  findByToken(@Param("token") token: string) {
    return this.events.findByToken(token);
  }
}
