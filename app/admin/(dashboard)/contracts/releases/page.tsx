import Link from "next/link";
import { redirect } from "next/navigation";
import { DocumentTemplateType } from "@prisma/client";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Releases · Contracts · Admin",
  robots: { index: false, follow: false },
};

const RELEASE_TYPES = [DocumentTemplateType.MODEL_RELEASE, DocumentTemplateType.PROPERTY_RELEASE];

export default async function AdminContractsReleasesPage() {
  if (!(await hasAdminAccess())) redirect("/admin/login");

  const rows = await prisma.generatedDocument.findMany({
    where: { template: { type: { in: RELEASE_TYPES } } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      template: { select: { title: true, type: true } },
      studioClient: { select: { companyName: true } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 text-white">
      <p className="text-xs uppercase tracking-[0.35em] text-white/50">
        <Link href="/admin/contracts" className="hover:text-white">
          Contracts
        </Link>{" "}
        / Releases
      </p>
      <h1 className="mt-2 font-display text-3xl">Model &amp; property releases</h1>
      <p className="mt-2 text-sm text-white/60">Filtered view of generated documents by release template types.</p>

      <div className="mt-8 overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-white/50">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                <td className="px-4 py-3 font-medium">{d.title}</td>
                <td className="px-4 py-3 text-white/70">{d.studioClient.companyName}</td>
                <td className="px-4 py-3 text-white/70">{d.template.type}</td>
                <td className="px-4 py-3">{d.status}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/contracts/generated/${d.id}`} className="text-amber-200/90 hover:text-amber-100">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-white/50">
                  No release documents yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
