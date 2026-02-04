const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;

const rateLimit = new Map<string, { count: number; resetAt: number }>();

export function getClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return "unknown";
}

export function isRateLimited(key: string) {
  const now = Date.now();
  const entry = rateLimit.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  if (entry.count >= MAX_REQUESTS) {
    return true;
  }
  entry.count += 1;
  return false;
}
