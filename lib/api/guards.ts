import type { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { requireProjectsApiAuth } from "@/lib/api/automation-auth";
import { jsonErr } from "@/lib/api/http";

/** Admin cookie session; returns an error response or null when OK. */
export async function guardAdminJson(req: Request): Promise<NextResponse | null> {
  if (!(await authorizeAdminRequest(req))) {
    return jsonErr("Unauthorized.", 401);
  }
  return null;
}

/** Admin cookie or automation bearer; returns an error response or null when OK. */
export async function guardProjectsApiJson(req: Request): Promise<NextResponse | null> {
  const auth = await requireProjectsApiAuth(req);
  if (!auth.ok) {
    return jsonErr(auth.error, auth.status);
  }
  return null;
}

/**
 * Vercel / external cron: `Authorization: Bearer CRON_SECRET`.
 * When `CRON_SECRET` is unset: allow outside production (matches legacy behavior).
 */
export function guardCronBearer(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV !== "production") return null;
    return jsonErr("Unauthorized.", 401);
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return jsonErr("Unauthorized.", 401);
  }
  return null;
}
