export function resolveR2Endpoint(
  accountId?: string,
  endpoint?: string,
): string {
  if (endpoint?.trim()) {
    return endpoint.trim();
  }
  if (accountId?.trim()) {
    return `https://${accountId.trim()}.r2.cloudflarestorage.com`;
  }
  return "";
}

export const R2_REQUIRED_ENV_KEYS = [
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_BASE_URL",
] as const;

export function validateR2Env(
  env: Record<string, string | undefined>,
): string[] {
  const missing: string[] = [];

  for (const key of R2_REQUIRED_ENV_KEYS) {
    if (!env[key]?.trim()) {
      missing.push(key);
    }
  }

  const endpoint = resolveR2Endpoint(env.R2_ACCOUNT_ID, env.R2_ENDPOINT);
  if (!endpoint) {
    missing.push("R2_ENDPOINT or R2_ACCOUNT_ID");
  }

  return missing;
}
