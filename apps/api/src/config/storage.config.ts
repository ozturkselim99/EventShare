import { registerAs } from "@nestjs/config";
import { resolveR2Endpoint } from "@eventshare/shared";

export default registerAs("storage", () => ({
  provider: process.env.STORAGE_PROVIDER ?? "local",
  r2: {
    accountId: process.env.R2_ACCOUNT_ID ?? "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    bucket: process.env.R2_BUCKET ?? "eventshare-media",
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL ?? "",
    endpoint: resolveR2Endpoint(
      process.env.R2_ACCOUNT_ID,
      process.env.R2_ENDPOINT,
    ),
  },
}));
