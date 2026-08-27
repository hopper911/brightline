import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { assertR2ManagerKeyAllowed, findR2KeyUsage } from "@/lib/admin-r2-manager";
import { findMirotechCmsRefsForKey } from "@/lib/admin-r2-mirotech-audit";
import { normalizeR2VaultId } from "@/lib/r2-vaults";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(req.url);
  const key = url.searchParams.get("key")?.trim() ?? "";
  const vault = normalizeR2VaultId(url.searchParams.get("vault"));
  if (!key) {
    return NextResponse.json({ ok: false, error: "key is required." }, { status: 400 });
  }

  try {
    assertR2ManagerKeyAllowed(key, vault);
    const cmsRefs = await findMirotechCmsRefsForKey(key);
    if (vault !== "brightline") {
      return NextResponse.json({
        ok: true,
        usage: {
          key,
          mediaAssets: [],
          galleryImages: [],
          galleryVideos: [],
          deliveryItems: [],
          other: [],
          totalRefs: cmsRefs.length,
        },
        cmsRefs,
        vault,
      });
    }
    const usage = await findR2KeyUsage(key);
    return NextResponse.json({
      ok: true,
      usage: {
        ...usage,
        totalRefs: usage.totalRefs + cmsRefs.length,
      },
      cmsRefs,
      vault,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Usage lookup failed.";
    const status =
      typeof err === "object" && err && "status" in err && typeof (err as { status: number }).status === "number"
        ? (err as { status: number }).status
        : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
