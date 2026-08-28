import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import {
  resolveStudioOpsContext,
  tenantAllowedForMemberships,
} from "@/lib/studio/ops/resolve-context";
import { STUDIO_OPS_TENANT_COOKIE } from "@/lib/studio/ops/nav";
import type { TenantSlug } from "@/lib/platform/tenants/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseTenant(body: unknown): TenantSlug | null {
  if (!body || typeof body !== "object") return null;
  const tenant = (body as { tenant?: unknown }).tenant;
  if (tenant === "brightline" || tenant === "mirotech") return tenant;
  return null;
}

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const tenant = parseTenant(body);
  if (!tenant) {
    return NextResponse.json({ ok: false, error: "Invalid tenant." }, { status: 400 });
  }

  const context = await resolveStudioOpsContext(req);
  if (!context) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!tenantAllowedForMemberships(tenant, context.memberships)) {
    return NextResponse.json({ ok: false, error: "Tenant not permitted for this operator." }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true, tenant });
  res.cookies.set(STUDIO_OPS_TENANT_COOKIE, tenant, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
