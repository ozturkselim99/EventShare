import { resolveR2Endpoint, validateR2Env } from "@eventshare/shared";

const provider = process.env.STORAGE_PROVIDER ?? "local";

if (provider !== "r2") {
  console.log(`STORAGE_PROVIDER=${provider} — R2 doğrulaması atlandı.`);
  process.exit(0);
}

const missing = validateR2Env({
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET: process.env.R2_BUCKET,
  R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,
  R2_ENDPOINT: process.env.R2_ENDPOINT,
});

if (missing.length > 0) {
  console.error("Eksik R2 yapılandırması:", missing.join(", "));
  console.error("Rehber: docs/r2-setup.md");
  process.exit(1);
}

const endpoint = resolveR2Endpoint(
  process.env.R2_ACCOUNT_ID,
  process.env.R2_ENDPOINT,
);

console.log("R2 yapılandırması geçerli.");
console.log(`  Bucket: ${process.env.R2_BUCKET}`);
console.log(`  Endpoint: ${endpoint}`);
console.log(`  Public URL: ${process.env.R2_PUBLIC_BASE_URL}`);
