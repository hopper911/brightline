import { NextResponse } from "next/server";
import { hasAdminAccessFromRequest } from "@/lib/admin-auth";
import {
  createMirotechHandoffToken,
  isMirotechHandoffConfigured,
  mirotechSiteOrigin,
  sanitizeMirotechAdminPath,
} from "@/lib/mirotech-admin-handoff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Brightline admin → Mirotech admin SSO handoff.
 * Requires an existing Brightline admin session; opens Mirotech dashboard without re-entering a code.
 */
export async function GET(req: Request) {
  if (!hasAdminAccessFromRequest(req)) {
    return NextResponse.redirect(new URL("/admin/login", req.url), 302);
  }

  if (!isMirotechHandoffConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Mirotech handoff is not configured. Set MIROTECH_ADMIN_HANDOFF_SECRET (32+ chars) on Brightline and Mirotech, then redeploy.",
      },
      { status: 503 }
    );
  }

  const url = new URL(req.url);
  const next = sanitizeMirotechAdminPath(url.searchParams.get("next"));
  const token = createMirotechHandoffToken(next);
  if (!token) {
    return NextResponse.json({ ok: false, error: "Could not mint handoff token." }, { status: 503 });
  }

  const dest = new URL("/api/admin/handoff", mirotechSiteOrigin());
  dest.searchParams.set("token", token);
  dest.searchParams.set("next", next);

  return NextResponse.redirect(dest.toString(), 302);
}
