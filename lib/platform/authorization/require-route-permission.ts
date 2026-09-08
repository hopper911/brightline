import "server-only";

import { NextResponse } from "next/server";
import { defaultAuthorizationService } from "@/lib/platform/authorization/default-authorization-service";
import { isAuthorizationError } from "@/lib/platform/authorization/errors";
import type { PlatformPermission } from "@/lib/platform/authorization/permissions";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import { resolveStudioAuthorizationSubject } from "@/lib/studio/projects/resolve-subject";
import type { TenantSlug } from "@/lib/platform/tenants/types";

/**
 * Second gate for Mission Control mutations when PLATFORM_IDENTITY_ENABLED.
 * Legacy admin cookie remains required by the caller. When identity is off, this is a no-op.
 *
 * Unlinked admin sessions still resolve as `legacy_admin` (synthetic OWNER). This only
 * constrains operators who are linked to a PlatformUser with a lesser role.
 */
export async function rejectUnlessPlatformPermission(
  permission: PlatformPermission,
  tenant: TenantSlug = "brightline"
): Promise<NextResponse | null> {
  if (!isPlatformFeatureEnabled("identity")) return null;

  const subject = await resolveStudioAuthorizationSubject();
  try {
    await defaultAuthorizationService.requirePermission({
      subject,
      tenant,
      permission,
    });
    return null;
  } catch (error) {
    if (isAuthorizationError(error)) {
      return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
    }
    throw error;
  }
}
