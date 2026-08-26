import { NextResponse } from "next/server";
import { rejectIfTokenDownloadLimited } from "@/lib/client-token-rate-limit";
import { buildDeliveryManifest } from "@/lib/delivery/package";
import { findValidFinalPackageProject } from "@/lib/final-package-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const limited = await rejectIfTokenDownloadLimited(req, token, "final-pkg-manifest", {
    max: 60,
    windowMs: 60 * 60_000,
  });
  if (limited) return limited;

  const project = await findValidFinalPackageProject(token);
  if (!project) {
    return NextResponse.json({ ok: false, error: "Package not found." }, { status: 404 });
  }
  const manifest = await buildDeliveryManifest(project.id);
  return NextResponse.json({ ok: true, manifest });
}
