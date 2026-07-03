import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Receiver } from "@upstash/qstash";

interface QstashRequest {
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
  rawBody?: Buffer;
}

@Injectable()
export class QstashSignatureGuard implements CanActivate {
  private readonly logger = new Logger(QstashSignatureGuard.name);
  private readonly receiver: Receiver | null;
  private readonly verificationDisabled: boolean;

  constructor(private readonly config: ConfigService) {
    const currentSigningKey = this.config.get<string>(
      "QSTASH_CURRENT_SIGNING_KEY",
    );
    const nextSigningKey = this.config.get<string>("QSTASH_NEXT_SIGNING_KEY");

    // Allow opting out only when explicitly set (e.g. isolated local testing)
    this.verificationDisabled =
      this.config.get<string>("QSTASH_VERIFY") === "false";

    if (currentSigningKey && nextSigningKey) {
      this.receiver = new Receiver({ currentSigningKey, nextSigningKey });
    } else {
      this.receiver = null;
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.verificationDisabled) return true;

    const request = context.switchToHttp().getRequest<QstashRequest>();
    const signature = request.headers["upstash-signature"] as
      | string
      | undefined;

    if (!this.receiver) {
      throw new UnauthorizedException(
        "QStash signing keys not configured (QSTASH_CURRENT_SIGNING_KEY / QSTASH_NEXT_SIGNING_KEY)",
      );
    }
    if (!signature) {
      throw new UnauthorizedException("Missing Upstash-Signature header");
    }

    const rawBody = request.rawBody;
    const body = rawBody ? rawBody.toString("utf8") : JSON.stringify(request.body);

    try {
      const valid = await this.receiver.verify({ signature, body });
      if (!valid) throw new Error("invalid");
      return true;
    } catch (error) {
      this.logger.warn(`QStash signature verification failed: ${error}`);
      throw new UnauthorizedException("Invalid QStash signature");
    }
  }
}
