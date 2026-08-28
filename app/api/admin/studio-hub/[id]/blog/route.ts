import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { rejectCrossSiteMutation } from "@/lib/admin-request-origin";
import {
  createHubBlog,
  isStudioHubConfigured,
} from "@/lib/dual-brand/studio-hub";
import { resolveStudioHubBlogPatch } from "@/lib/platform/publishing/integrations/studio-hub-publish";
import { isAsyncPublishAccepted } from "@/lib/platform/publishing/async-publish-types";
import { sanitizeHubBlogPayload } from "@/lib/dual-brand/studio-hub-payload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const csrf = rejectCrossSiteMutation(req);
  if (csrf) return csrf;
  if (!isStudioHubConfigured()) {
    return NextResponse.json({ ok: false, error: "Studio hub not configured." }, { status: 503 });
  }

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  try {
    const result = await createHubBlog(id, sanitizeHubBlogPayload(body));
    return NextResponse.json({ ok: true, ...result }, { status: result.created ? 201 : 200 });
  } catch (e) {
    console.error("STUDIO_HUB_BLOG_CREATE_ERROR", e);
    return NextResponse.json({ ok: false, error: "Blog create failed" }, { status: 502 });
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const csrf = rejectCrossSiteMutation(req);
  if (csrf) return csrf;
  if (!isStudioHubConfigured()) {
    return NextResponse.json({ ok: false, error: "Studio hub not configured." }, { status: 503 });
  }

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });

  try {
    const outcome = await resolveStudioHubBlogPatch(id, sanitizeHubBlogPayload(body));
    if (isAsyncPublishAccepted(outcome)) {
      return NextResponse.json({ ok: true, ...outcome });
    }
    return NextResponse.json({ ok: true, ...outcome });
  } catch (e) {
    console.error("STUDIO_HUB_BLOG_PATCH_ERROR", e);
    return NextResponse.json({ ok: false, error: "Blog save failed" }, { status: 502 });
  }
}
