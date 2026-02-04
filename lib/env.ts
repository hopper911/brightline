const REQUIRED_ENV_KEYS = ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL"];

export function assertServerEnv(keys: string[] = REQUIRED_ENV_KEYS) {
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}
