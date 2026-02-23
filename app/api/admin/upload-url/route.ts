import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getMarketingUploadUrl } from "@/lib/image-strategy";
import { hasAdminAccess } from "@/lib/admin-auth";

const ROUTE_NAME = "api/admin/upload-url";

function toHumanMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "Upload failed.";
  const e = err as { message?: string; name?: string; code?: string };
  if (e.message?.includes("Missing storage env vars"))
    return e.message;
  if (e.name === "AccessDenied" || e.code === "AccessDenied")
    return "Storage access denied. Check R2/S3 credentials.";
  if (e.name === "SignatureDoesNotMatch" || e.code === "SignatureDoesNotMatch")
    return "Storage signature error. Check credentials and clock sync.";
  return e.message ?? "Upload failed.";
}

export async function POST(req: Request) {
  try {
    const isAdmin = await hasAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    let body: {
      filename?: string;
      contentType?: string;
      categorySlug?: string;
      projectSlug?: string;
    };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    if (!body.filename || !body.categorySlug || !body.projectSlug) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: filename, categorySlug, projectSlug." },
        { status: 400 }
      );
    }

    const key = `portfolio/${body.categorySlug}/${body.projectSlug}/${Date.now()}-${body.filename}`;
    const signed = await getMarketingUploadUrl({
      key,
      contentType: body.contentType,
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
    const message = toHumanMessage(err);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
