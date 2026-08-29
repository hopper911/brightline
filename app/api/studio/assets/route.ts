import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { canReadStudioMedia } from "@/lib/studio/access";
import { listStudioAssetsForTenant } from "@/lib/studio/media/list-studio-assets";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";
import type { TenantSlug } from "@/lib/platform/tenants/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseTenant(raw: string | null): TenantSlug | null {
  const v = raw?.trim().toLowerCase();
  if (v === "brightline" || v === "mirotech") return v;
  return null;
}

/** Tenant-scoped asset registry listing for Studio media picker. */
export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const context = await resolveStudioOpsContext(req);
  if (!context) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const legacyAdmin = context.subjectKind === "legacy_admin";
  if (!canReadStudioMedia(context.permissions, legacyAdmin)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const url = new URL(req.url);
  const tenant = parseTenant(url.searchParams.get("tenant"));
  if (!tenant || !context.memberships.some((m) => m.tenantSlug === tenant)) {
    return NextResponse.json({ ok: false, error: "Invalid tenant." }, { status: 400 });
  }

  const cursor = url.searchParams.get("cursor") ?? undefined;
  const listing = await listStudioAssetsForTenant(tenant, { cursor, limit: 40 });

  return NextResponse.json({ ok: true, ...listing });
}
