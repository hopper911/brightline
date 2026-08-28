import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { canPublishBrightlineJournal, canViewStudioPublishing } from "@/lib/studio/access";
import { studioActorFromContext } from "@/lib/studio/publishing/actor";
import { studioSyncBlogPostToMirotech } from "@/lib/studio/publishing/studio-publish-actions";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const context = await resolveStudioOpsContext(req);
  if (!context) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const legacyAdmin = context.subjectKind === "legacy_admin";
  if (!canViewStudioPublishing(context.permissions, legacyAdmin)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  if (!canPublishBrightlineJournal(context.permissions, legacyAdmin)) {
    return NextResponse.json({ ok: false, error: "Brightline publish permission required." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const postId =
    body && typeof body === "object" && typeof (body as { postId?: unknown }).postId === "string"
      ? (body as { postId: string }).postId.trim()
      : "";
  if (!postId) {
    return NextResponse.json({ ok: false, error: "postId required." }, { status: 400 });
  }

  const result = await studioSyncBlogPostToMirotech({
    postId,
    actor: studioActorFromContext(context),
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: result.code === "not_found" ? 404 : 400 });
  }

  return NextResponse.json(result);
}
