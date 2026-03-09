import { NextResponse } from "next/server";
import { hasAdminAccess } from "@/lib/admin-auth";
import { listObjects } from "@/lib/storage-r2";

const ALLOWED_PREFIXES = ["portfolio/", "work/"];

function isPrefixAllowed(prefix: string): boolean {
  const normalized = prefix.replace(/^\/+/, "").toLowerCase();
  return ALLOWED_PREFIXES.some((p) => normalized.startsWith(p) || normalized === p.replace(/\/$/, ""));
}

export const runtime = "nodejs";

export async function POST(req: Request) {
  let prefix = "";
  try {
    const isAdmin = await hasAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    let body: { prefix?: string; maxKeys?: number };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }

    prefix = (body.prefix ?? "").trim();
    if (!prefix) {
      return NextResponse.json({ ok: false, error: "prefix is required." }, { status: 400 });
    }

    if (!isPrefixAllowed(prefix)) {
      return NextResponse.json(
        { ok: false, error: "Prefix must start with portfolio/ or work/." },
        { status: 400 }
      );
    }

    const keys = await listObjects({
      prefix: prefix.endsWith("/") ? prefix : `${prefix}/`,
      maxKeys: Math.min(typeof body.maxKeys === "number" ? body.maxKeys : 500, 1000),
    });

    return NextResponse.json({ ok: true, keys });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to list objects.";
    const errorName = err instanceof Error ? err.name : "unknown";
    const isHeaderError =
      typeof message === "string" &&
      (message.includes("Invalid character in header content") || message.toLowerCase().includes("authorization"));
    const payload: {
      ok: false;
      error: string;
      code?: string;
      details?: Record<string, unknown>;
      timestamp?: string;
      prefix?: string;
    } = {
      ok: false,
      error: message,
      timestamp: new Date().toISOString(),
      ...(prefix ? { prefix } : {}),
    };
    if (isHeaderError) {
      payload.code = "R2_HEADER_ERROR";
      payload.details = { errorName, hint: "Check R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY for newlines/quotes." };
    } else {
      payload.details = { errorName };
    }
    console.error("R2_LIST_ERROR", err);
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/87b19e1b-4972-445b-9274-7007d1226ee3", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "50da27" },
      body: JSON.stringify({
        sessionId: "50da27",
        runId: "r2-list-debug-2",
        hypothesisId: "H21",
        location: "app/api/admin/r2-list/route.ts:50",
        message: "R2 list route error",
        data: { errorMessage: message, errorName, ...payload.details },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return NextResponse.json(payload, { status: 500 });
  }
}
