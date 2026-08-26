import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Document templates · Contracts · Admin",
  robots: { index: false, follow: false },
};

export default async function AdminContractTemplatesPage() {
  if (!(await hasAdminAccess())) redirect("/admin/login");
  const rows = await prisma.documentTemplate.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 text-white">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">
            <Link href="/admin/contracts" className="hover:text-white">
              Contracts
            </Link>{" "}
            / Templates
          </p>
          <h1 className="mt-2 font-display text-3xl">Document templates</h1>
        </div>
        <Link href="/admin/contracts/templates/new" className="btn btn-primary">
          New template
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-white/50">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Ver.</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                <td className="px-4 py-3 font-medium">{t.title}</td>
                <td className="px-4 py-3 text-white/70">{t.type}</td>
                <td className="px-4 py-3 text-white/70">{t.version}</td>
                <td className="px-4 py-3">{t.isActive ? "Yes" : "No"}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/contracts/templates/${t.id}`} className="text-amber-200/90 hover:text-amber-100">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-white/50">
                  No templates yet. Run seed from Settings or create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
