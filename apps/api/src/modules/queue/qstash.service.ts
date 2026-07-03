import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client } from "@upstash/qstash";
import { JobName, type ProcessMediaJobData } from "@eventshare/shared";

@Injectable()
export class QstashService {
  private readonly logger = new Logger(QstashService.name);
  private readonly client: Client;
  private readonly workerUrl: string;

  constructor(private readonly config: ConfigService) {
    const baseUrl = this.config.get<string>("app.qstash.url");
    this.client = new Client({
      token: this.config.get<string>("app.qstash.token") ?? "",
      ...(baseUrl ? { baseUrl } : {}),
    });
    this.workerUrl = (
      this.config.get<string>("app.qstash.workerUrl") ?? ""
    ).replace(/\/$/, "");
  }

  async publishMediaJob(jobName: JobName, data: ProcessMediaJobData) {
    const url = `${this.workerUrl}/jobs/media`;
    await this.client.publishJSON({
      url,
      body: { jobName, ...data },
      retries: 3,
    });
    this.logger.log(`Published ${jobName} for media ${data.mediaId} -> ${url}`);
  }
}
