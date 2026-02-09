export function assertServerEnv(keys: string[] = []) {
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}
