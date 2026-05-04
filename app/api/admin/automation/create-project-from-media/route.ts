import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import {
  createProjectFromMedia,
  ensureAutoProjectRule,
  recentAutoCreatedProjects,
} from "@/lib/automation/create-project-from-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorize(req: Request) {
  if (await authorizeAdminRequest(req)) return true;
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const expected = process.env.UPLOAD_TOKEN;
  return Boolean(expected && token && token === expected);
}

export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const [rule, recentDrafts] = await Promise.all([
    ensureAutoProjectRule(),
    recentAutoCreatedProjects(),
  ]);
  return NextResponse.json({ ok: true, rule, recentDrafts });
}

export async function POST(req: Request) {
  if (!(await authorize(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: { keys?: unknown; mediaAssetKeys?: unknown; generateCopy?: unknown; force?: unknown; source?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const rawKeys = Array.isArray(body.keys) ? body.keys : Array.isArray(body.mediaAssetKeys) ? body.mediaAssetKeys : [];
  const keys = rawKeys.map((key) => (typeof key === "string" ? key.trim() : "")).filter(Boolean);
  if (!keys.length) {
    return NextResponse.json({ ok: false, error: "list of media asset keys is required." }, { status: 400 });
  }

  try {
    const result = await createProjectFromMedia({
      keys,
      generateCopy: body.generateCopy === true,
      force: body.force === true,
      source: typeof body.source === "string" ? body.source : "api",
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("AUTO_CREATE_PROJECT_FROM_MEDIA_ERROR", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to create project from media." },
      { status: 500 }
    );
  }
}

