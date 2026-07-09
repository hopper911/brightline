type RateLimitOptions = {
  scope?: string;
  max?: number;
  windowMs?: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "127.0.0.1";
  }
  return "127.0.0.1";
}

export function isRateLimited(ip: string, options?: RateLimitOptions): boolean {
  const scope = options?.scope ?? "default";
  const max = options?.max ?? 60;
  const windowMs = options?.windowMs ?? 60_000;
  const key = `${scope}:${ip}`;
  const now = Date.now();

  const current = buckets.get(key);
  if (!current || now >= current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  current.count += 1;
  return current.count > max;
}
