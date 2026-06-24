import { Module } from "@nestjs/common";
import { EventsService } from "./events.service";
import { AdminEventsController, PublicEventsController } from "./events.controller";

@Module({
  providers: [EventsService],
  controllers: [AdminEventsController, PublicEventsController],
  exports: [EventsService],
})
export class EventsModule {}
