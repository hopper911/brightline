import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { auditAdminMediaUploadUrlCreated } from "@/lib/platform/audit/integrations/admin-media-upload-url";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import { adminMediaUploadUrlErrorMessage } from "@/lib/platform/media/integrations/errors";
import { createPortfolioPublicUploadUrlViaMediaService } from "@/lib/platform/media/integrations/portfolio-public-upload-url";
import { defaultMediaService } from "@/lib/platform/media/server";
import { normalizeUploadContentType } from "@/lib/upload-mime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE_NAME = "api/admin/portfolio/upload-url";

function toHumanMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "Unable to create upload URL.";
  const e = err as { message?: string; name?: string; code?: string };
  if (e.message?.includes("Missing storage env vars")) return e.message;
  if (e.name === "AccessDenied" || e.code === "AccessDenied")
    return "Storage access denied. Check R2/S3 credentials.";
  if (e.name === "SignatureDoesNotMatch" || e.code === "SignatureDoesNotMatch")
    return "Storage signature error. Check credentials and clock sync.";
  return e.message ?? "Unable to create upload URL.";
}

function buildPortfolioPublicObjectKey(filename: string): string {
  const ext = filename.split(".").pop()?.replace(/[^\w]/g, "") || "jpg";
  return `portfolio-public/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
}

export async function POST(req: Request) {
  try {
    const isAdmin = await authorizeAdminRequest(req);
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    let body: { filename?: string; contentType?: string };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    if (!body.filename) {
      return NextResponse.json(
        { ok: false, error: "Filename required." },
        { status: 400 }
      );
    }

    const contentType = normalizeUploadContentType(body.contentType || "image/jpeg");
    if (!contentType) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Unsupported content type. Upload images, video, audio, PDF, or fonts only (not HTML/SVG).",
        },
        { status: 400 }
      );
    }

    const key = buildPortfolioPublicObjectKey(body.filename);

    if (isPlatformFeatureEnabled("media")) {
      try {
        const result = await createPortfolioPublicUploadUrlViaMediaService(defaultMediaService, {
          objectKey: key,
          contentType,
        });
        await auditAdminMediaUploadUrlCreated({
          route: "/api/admin/portfolio/upload-url",
          key,
          contentType,
        });
        return NextResponse.json(result);
      } catch (error) {
        console.error("UPLOAD_ERROR", { route: ROUTE_NAME, err: error, platformMedia: true });
        return NextResponse.json(
          { ok: false, error: adminMediaUploadUrlErrorMessage(error) },
          { status: 500 }
        );
      }
    }

    // Legacy path — unchanged until full migration (Phase 3D flag off by default).
    const { getMarketingUploadUrl } = await import("@/lib/image-strategy");
    const signed = await getMarketingUploadUrl({
      key,
      contentType,
    });

    return NextResponse.json({ ok: true, url: signed.url, headers: signed.headers });
  } catch (err: unknown) {
    console.error("UPLOAD_ERROR", {
      route: ROUTE_NAME,
      err,
      hasR2: Boolean(process.env.R2_BUCKET),
      hasS3: Boolean(process.env.S3_BUCKET),
    });
    return NextResponse.json(
      { ok: false, error: toHumanMessage(err) },
      { status: 500 }
    );
  }
}
