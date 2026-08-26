import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { DocumentDetailClient } from "../DocumentDetailClient";

export const dynamic = "force-dynamic";

export default async function AdminGeneratedDocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminAccess())) redirect("/admin/login");
  const { id } = await params;
  const row = await prisma.generatedDocument.findUnique({
    where: { id },
    include: {
      template: true,
      studioClient: true,
      studioProject: true,
      signature: true,
    },
  });
  if (!row) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.35em] text-white/50">
        <Link href="/admin/contracts/generated" className="hover:text-white">
          Generated
        </Link>{" "}
        / Detail
      </p>
      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/65">
        <span>{row.template.title}</span>
        {" · "}
        <span>{row.studioClient.companyName}</span>
        {row.studioProject && (
          <>
            {" · "}
            <Link href={`/admin/projects/${row.studioProject.id}`} className="text-amber-200/90 hover:text-amber-100">
              {row.studioProject.title}
            </Link>
          </>
        )}
      </div>
      <h1 className="mt-6 font-display text-3xl text-white">{row.title}</h1>
      <div className="mt-8">
        <DocumentDetailClient
          document={{
            id: row.id,
            title: row.title,
            status: row.status,
            contentHtml: row.contentHtml,
            clientToken: row.clientToken,
            sentAt: row.sentAt,
          }}
        />
        {row.signature && (
          <div className="mt-10 rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/80">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Signature on file</p>
            <p className="mt-3 font-medium text-white">{row.signature.signerName}</p>
            <p className="text-white/75">{row.signature.signerEmail}</p>
            <p className="mt-2 text-white/50">{row.signature.signedAt.toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}
