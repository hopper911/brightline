import { guardAdminJson } from "@/lib/api/guards";
import { jsonErr, jsonOk } from "@/lib/api/http";
import { packageInclude } from "@/lib/delivery/db";
import {
  deliveryPackagePublicUrl,
  sendDeliveryPackageEmail,
} from "@/lib/delivery/email";
import { cleanText } from "@/lib/delivery/package";
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
    include: packageInclude(),
  });
  if (!pkg) return jsonErr("Delivery package not found.", 404);

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    /* optional body */
  }

  const to = cleanText(body.to) ?? pkg.client?.email?.trim();
  if (!to) {
    return jsonErr(
      "Recipient email missing. Set Studio client email or pass `to` in the request body.",
      400
    );
  }

  const clientName =
    pkg.client?.companyName?.trim() ||
    pkg.project.client?.trim() ||
    "Client";
  const projectTitle = pkg.project.title ?? "Project";
  const packageUrl = deliveryPackagePublicUrl(pkg.accessToken);

  const emailResult = await sendDeliveryPackageEmail({
    to,
    clientName,
    projectTitle,
    packageTitle: pkg.title,
    deliveryMessage: pkg.deliveryMessage,
    packageUrl,
    usageRightsSummary: pkg.usageRights,
  });

  if (!emailResult.ok) {
    return jsonErr(emailResult.error ?? "Email send failed.", 502);
  }

  const markSent = body.markSent === true;
  let updated = pkg;
  if (markSent) {
    updated = await prisma.deliveryPackage.update({
      where: { id: packageId },
      data: { status: "sent" },
      include: packageInclude(),
    });
  }

  return jsonOk({ emailId: emailResult.id, package: updated });
}
