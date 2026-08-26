import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import {
  generateContractTemplateHtml,
  parseTemplateAiDraftBody,
} from "@/lib/contracts/template-ai-draft";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const ip = getClientIp(req);
  if (await isRateLimitedAsync(ip)) {
    return NextResponse.json(
      { ok: false, error: "Too many AI generation requests. Try again shortly." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseTemplateAiDraftBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
  }

  try {
    const { html, model } = await generateContractTemplateHtml(parsed.data);
    return NextResponse.json({ ok: true, html, model });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "AI generation failed.";
    const status =
      typeof e === "object" &&
      e !== null &&
      "status" in e &&
      typeof (e as { status?: unknown }).status === "number"
        ? (e as { status: number }).status
        : 502;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
