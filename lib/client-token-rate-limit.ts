import { NextResponse } from "next/server";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";

/** Rate-limit package / final-package token downloads (per IP + token). */
export async function rejectIfTokenDownloadLimited(
  req: Request,
  token: string,
  scope: string,
  opts?: { max?: number; windowMs?: number }
): Promise<NextResponse | null> {
  const ip = getClientIp(req);
  const max = opts?.max ?? 40;
  const windowMs = opts?.windowMs ?? 60 * 60_000;
  const key = `${ip}:${token.slice(0, 24)}`;
  if (await isRateLimitedAsync(key, { scope, max, windowMs })) {
    return NextResponse.json({ ok: false, error: "Too many requests. Try again later." }, { status: 429 });
  }
  return null;
}
