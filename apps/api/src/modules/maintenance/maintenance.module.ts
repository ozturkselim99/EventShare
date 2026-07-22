import { Module } from "@nestjs/common";
import { MediaReconciliationService } from "./media-reconciliation.service";
import { QstashModule } from "../queue/qstash.module";

@Module({
  imports: [QstashModule],
  providers: [MediaReconciliationService],
})
export class MaintenanceModule {}
