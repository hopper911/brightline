import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { FormTemplateBuilder } from "../FormTemplateBuilder";

export const dynamic = "force-dynamic";

export default async function EditFormTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminAccess())) redirect("/admin/login");
  const { id } = await params;
  const row = await prisma.formTemplate.findUnique({
    where: { id },
    include: { fields: { orderBy: { sortOrder: "asc" } } },
  });
  if (!row) notFound();

  const initialFieldsJson = JSON.stringify(
    row.fields.map((f) => ({
      label: f.label,
      fieldType: f.fieldType,
      placeholder: f.placeholder,
      required: f.required,
      options: f.options as string[] | null,
      sortOrder: f.sortOrder,
      mapsToProjectField: f.mapsToProjectField,
    })),
    null,
    2
  );

  return (
    <div className="px-4 py-16">
      <p className="text-xs uppercase tracking-[0.35em] text-white/50">
        <Link href="/admin/contracts/forms" className="hover:text-white">
          Forms
        </Link>{" "}
        / {row.title}
      </p>
      <FormTemplateBuilder
        templateId={row.id}
        initialTitle={row.title}
        initialDescription={row.description}
        initialFieldsJson={initialFieldsJson}
      />
    </div>
  );
}
