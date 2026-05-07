import { guardAdminJson } from "@/lib/api/guards";
import { jsonErr, jsonOk } from "@/lib/api/http";
import { DELIVERY_PRESETS } from "@/lib/delivery/presets";
import { generatePresetExportsForPackage } from "@/lib/delivery/export-presets";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ packageId: string }> }
) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;

  const { packageId } = await context.params;
  const pkg = await prisma.deliveryPackage.findUnique({
    where: { id: packageId },
    select: { id: true },
  });
  if (!pkg) return jsonErr("Delivery package not found.", 404);

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    /* empty body OK */
  }

  const fromBody = Array.isArray(body.presetIds) ? body.presetIds : null;
  const presetIds = (
    fromBody
      ? fromBody.filter((id): id is string => typeof id === "string" && id.length > 0)
      : DELIVERY_PRESETS.map((p) => p.id)
  );
  const maxSources =
    typeof body.maxSources === "number" && Number.isFinite(body.maxSources)
      ? Math.max(0, Math.floor(body.maxSources))
      : undefined;

  const result = await generatePresetExportsForPackage({
    packageId,
    presetIds,
    maxSources,
  });
  if (!result.ok) {
    return jsonErr(result.error, 400);
  }
  return jsonOk({
    created: result.created,
    errors: result.errors,
  });
}
