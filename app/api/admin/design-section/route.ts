import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import {
  getDesignSectionSettings,
  saveDesignSectionSettings,
} from "@/lib/design-section-settings";
import { auditDesignSectionSettingsSaved } from "@/lib/platform/audit/integrations/design-section-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const settings = await getDesignSectionSettings();
  return NextResponse.json({ ok: true, settings });
}

export async function PUT(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  const settings = await saveDesignSectionSettings(body);
  await auditDesignSectionSettingsSaved(body);
  return NextResponse.json({ ok: true, settings });
}
