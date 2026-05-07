import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Short public path: resolves opaque slug then redirects to the private token URL. */
export default async function DeliveryPublicSlugRedirect({
  params,
}: {
  params: Promise<{ publicSlug: string }>;
}) {
  const { publicSlug } = await params;
  const slug = decodeURIComponent(publicSlug || "").trim();
  if (!slug) notFound();

  const pkg = await prisma.deliveryPackage.findFirst({
    where: {
      publicSlug: slug,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { accessToken: true },
  });
  if (!pkg) notFound();

  redirect(`/package/${pkg.accessToken}`);
}
