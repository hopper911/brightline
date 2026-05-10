import { NextResponse } from "next/server";

import { requireProjectsApiAuth } from "@/lib/api/automation-auth";
import { apiLog } from "@/lib/observability/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Machine-ingestion endpoint for Mission Control automations (n8n, workers).
 * Idempotent by optional `idempotencyKey` in body (logged only; store if you add `StudioAutomationEvent` later).
 */
export async function POST(req: Request) {
  const auth = await requireProjectsApiAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  if (body === null || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Body must be a JSON object." }, { status: 400 });
  }

  const b = body as {
    event?: string;
    idempotencyKey?: string;
    occurredAt?: string;
    entity?: { type?: string; id?: string };
    payload?: unknown;
  };

  const event = typeof b.event === "string" ? b.event.trim() : "";
  if (!event) {
    return NextResponse.json({ ok: false, error: 'Missing string field "event".' }, { status: 400 });
  }

  apiLog("studio_automation_event", "info", "received", {
    event,
    idempotencyKey: b.idempotencyKey ?? null,
    entityType: b.entity?.type ?? null,
    entityId: b.entity?.id ?? null,
  });

  return NextResponse.json({
    ok: true,
    received: true,
    event,
  });
}
