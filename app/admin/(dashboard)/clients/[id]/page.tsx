import { notFound, redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import StudioClientDetail from "./client-detail";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Client · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login");

  const { id } = await params;

  const client = await prisma.studioClient.findUnique({
    where: { id },
    include: {
      projects: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          totalPrice: true,
          amountPaid: true,
          balanceRemaining: true,
          paymentStatus: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!client) notFound();

  const leads = await prisma.studioLead.findMany({
    where: { convertedClientId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      createdAt: true,
      convertedProjectId: true,
    },
  });

  const totalSpend = await prisma.studioPayment.aggregate({
    where: { project: { clientId: id } },
    _sum: { amount: true },
  });

  const { projects, ...rest } = client;
  const initialClient = {
    ...rest,
    followUpAt: rest.followUpAt?.toISOString() ?? null,
    totalSpend: (totalSpend._sum.amount ?? 0).toString(),
    createdAt: rest.createdAt.toISOString(),
    updatedAt: rest.updatedAt.toISOString(),
  };
  const initialProjects = projects.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    status: p.status,
    totalPrice: p.totalPrice.toString(),
    amountPaid: p.amountPaid.toString(),
    balanceRemaining: p.balanceRemaining.toString(),
    paymentStatus: p.paymentStatus,
    updatedAt: p.updatedAt.toISOString(),
  }));
  const initialLeads = leads.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <StudioClientDetail
      initialClient={initialClient}
      initialProjects={initialProjects}
      initialLeads={initialLeads}
    />
  );
}
