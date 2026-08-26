import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { GeneratorForm } from "../GeneratorForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Generate document · Contracts · Admin",
  robots: { index: false, follow: false },
};

export default async function AdminGenerateDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; projectId?: string; invoiceId?: string; templateId?: string }>;
}) {
  if (!(await hasAdminAccess())) redirect("/admin/login");
  const sp = await searchParams;

  const [clients, templates] = await Promise.all([
    prisma.studioClient.findMany({
      where: { isActive: true },
      orderBy: { companyName: "asc" },
      select: { id: true, companyName: true },
      take: 500,
    }),
    prisma.documentTemplate.findMany({
      where: { isActive: true },
      orderBy: { title: "asc" },
      select: { id: true, title: true, type: true },
    }),
  ]);

  if (templates.length === 0) {
    return (
      <div className="px-4 py-16 text-white">
        <p className="text-white/70">Create or seed at least one template first.</p>
        <Link href="/admin/contracts/templates" className="mt-4 inline-block text-amber-200 hover:text-amber-100">
          Templates
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-16">
      <p className="mx-auto max-w-xl text-xs uppercase tracking-[0.35em] text-white/50">
        <Link href="/admin/contracts/generated" className="hover:text-white">
          Generated
        </Link>{" "}
        / New
      </p>
      <h1 className="mx-auto mb-8 max-w-xl font-display text-3xl text-white">Generate document</h1>
      <GeneratorForm
        clients={clients}
        templates={templates}
        initialClientId={sp.clientId}
        initialProjectId={sp.projectId}
        initialInvoiceId={sp.invoiceId}
        initialTemplateId={sp.templateId}
      />
    </div>
  );
}
