import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { TemplateEditor } from "../TemplateEditor";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await prisma.documentTemplate.findUnique({ where: { id }, select: { title: true } });
  return {
    title: row ? `${row.title} · Template · Admin` : "Template · Admin",
    robots: { index: false, follow: false },
  };
}

export default async function EditContractTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminAccess())) redirect("/admin/login");
  const { id } = await params;
  const row = await prisma.documentTemplate.findUnique({ where: { id } });
  if (!row) notFound();

  return (
    <div className="px-4 py-16">
      <p className="mx-auto max-w-4xl text-xs uppercase tracking-[0.35em] text-white/50">
        <Link href="/admin/contracts/templates" className="hover:text-white">
          Templates
        </Link>{" "}
        / Edit
      </p>
      <div className="mx-auto mb-6 flex max-w-4xl flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl text-white">{row.title}</h1>
        <span className="text-sm text-white/50">v{row.version}</span>
      </div>
      <TemplateEditor
        mode="edit"
        templateId={row.id}
        initial={{
          title: row.title,
          type: row.type,
          description: row.description,
          contentHtml: row.contentHtml,
          variables: JSON.stringify(row.variables ?? [], null, 2),
          isActive: row.isActive,
          version: row.version,
          genAiEnabled: row.genAiEnabled,
          genAiSystemPrompt: row.genAiSystemPrompt,
          genAiUserPrompt: row.genAiUserPrompt,
          genAiModel: row.genAiModel,
        }}
      />
    </div>
  );
}
