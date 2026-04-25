import { notFound, redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import StudioLeadDetail from "./lead-detail";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Studio Lead · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export default async function AdminStudioLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login");

  const { id } = await params;

  const lead = await prisma.studioLead.findUnique({
    where: { id },
    include: {
      convertedClient: { select: { id: true, companyName: true } },
      convertedProject: { select: { id: true, title: true, slug: true } },
    },
  });

  if (!lead) notFound();

  const initialLead = {
    ...lead,
    followUpDate: lead.followUpDate ? lead.followUpDate.toISOString() : null,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };

  return <StudioLeadDetail initialLead={initialLead} />;
}

