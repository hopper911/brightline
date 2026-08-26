/**
 * Rate limiting with shared store:
 * 1) Upstash Redis REST (if UPSTASH_REDIS_REST_URL + TOKEN)
 * 2) Neon/Postgres RateLimitBucket (default shared)
 * 3) In-process Map fallback if DB is unreachable
 */

import { prisma } from "@/lib/prisma";

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

/** Prefer platform-trusted client IP over the first X-Forwarded-For hop (spoofable). */
export function getClientIp(req: Request): string {
  const vercel = req.headers.get("x-vercel-forwarded-for");
  if (vercel) {
    const ip = vercel.split(",")[0]?.trim();
    if (ip) return ip;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    // Proxies typically append; rightmost is the peer closest to us (harder to spoof).
    // Prefer x-vercel-forwarded-for / x-real-ip above when available.
    if (parts.length) return parts[parts.length - 1]!;
  }
  return "127.0.0.1";
}

function upstashConfigured(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

async function isRateLimitedUpstash(
  key: string,
  max: number,
  windowMs: number,
  cfg: { url: string; token: string }
): Promise<boolean> {
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const redisKey = `rl:${key}`;
  try {
    const res = await fetch(`${cfg.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, String(windowSec), "NX"],
      ]),
      cache: "no-store",
    });
    if (!res.ok) return isRateLimitedPostgres(key, max, windowMs);
    const data = (await res.json()) as Array<{ result?: number | string | null }>;
    const count = Number(data?.[0]?.result ?? 0);
    return Number.isFinite(count) && count > max;
  } catch {
    return isRateLimitedPostgres(key, max, windowMs);
  }
}

async function isRateLimitedPostgres(key: string, max: number, windowMs: number): Promise<boolean> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  try {
    const rows = await prisma.$queryRaw<Array<{ count: number }>>`
      INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
      VALUES (${key}, 1, ${resetAt})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimitBucket"."resetAt" <= ${now} THEN 1
          ELSE "RateLimitBucket"."count" + 1
        END,
        "resetAt" = CASE
          WHEN "RateLimitBucket"."resetAt" <= ${now} THEN ${resetAt}
          ELSE "RateLimitBucket"."resetAt"
        END
      RETURNING "count"
    `;
    const count = Number(rows[0]?.count ?? 0);
    return Number.isFinite(count) && count > max;
  } catch (err) {
    console.error("RATE_LIMIT_DB_FALLBACK", err);
    return isRateLimitedMemory(key, max, windowMs);
  }
}

function isRateLimitedMemory(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || now >= current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  current.count += 1;
  return current.count > max;
}

/**
 * Sync helper for rare non-async contexts — memory only.
 * Prefer `isRateLimitedAsync` on API routes.
 */
export function isRateLimited(ip: string, options?: RateLimitOptions): boolean {
  const scope = options?.scope ?? "default";
  const max = options?.max ?? 60;
  const windowMs = options?.windowMs ?? 60_000;
  return isRateLimitedMemory(`${scope}:${ip}`, max, windowMs);
}

/** Cross-instance rate limit: Upstash → Postgres → memory. */
export async function isRateLimitedAsync(
  ip: string,
  options?: RateLimitOptions
): Promise<boolean> {
  const scope = options?.scope ?? "default";
  const max = options?.max ?? 60;
  const windowMs = options?.windowMs ?? 60_000;
  const key = `${scope}:${ip}`;
  const cfg = upstashConfigured();
  if (cfg) return isRateLimitedUpstash(key, max, windowMs, cfg);
  return isRateLimitedPostgres(key, max, windowMs);
}
