import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getMarketingUploadUrl } from "@/lib/image-strategy";
import { hasAdminAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

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

export async function POST(req: Request) {
  try {
    const isAdmin = await hasAdminAccess();
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

    const ext = body.filename.split(".").pop() || "jpg";
    const key = `portfolio-public/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const signed = await getMarketingUploadUrl({
      key,
      contentType: body.contentType || "image/jpeg",
    });

    return NextResponse.json({ ok: true, url: signed.url });
  } catch (err: unknown) {
    console.error("UPLOAD_ERROR", {
      route: ROUTE_NAME,
      err,
      hasR2: Boolean(process.env.R2_BUCKET),
      hasS3: Boolean(process.env.S3_BUCKET),
    });
    Sentry.captureException(err);
    return NextResponse.json(
      { ok: false, error: toHumanMessage(err) },
      { status: 500 }
    );
  }
}
