import { redirect } from "next/navigation";
import { getAccountantPortalContext } from "@/lib/accountant/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AccountantDocumentsPage() {
  const ctx = await getAccountantPortalContext();
  if (!ctx) redirect("/accountant/login");
  if (!ctx.permissions.canDownloadDocuments) redirect("/accountant");

  const docs = await prisma.accountingDocument.findMany({
    orderBy: { createdAt: "desc" },
    take: 80,
    select: {
      id: true,
      title: true,
      kind: true,
      r2Key: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
      dateRangeStart: true,
      dateRangeEnd: true,
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-white">Documents</h1>
        <p className="mt-1 text-sm text-white/55">Generated bundles and persisted CSV reports.</p>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-white/45">
            <tr>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Kind</th>
              <th className="px-4 py-3">Range</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="text-white/80">
            {docs.map((d) => (
              <tr key={d.id} className="border-b border-white/5">
                <td className="px-4 py-3 text-white/60">{d.createdAt.toLocaleString()}</td>
                <td className="px-4 py-3">{d.title}</td>
                <td className="px-4 py-3 text-xs">{d.kind}</td>
                <td className="px-4 py-3 text-xs text-white/50">
                  {d.dateRangeStart ? d.dateRangeStart.toLocaleDateString() : "—"}
                  {" → "}
                  {d.dateRangeEnd ? d.dateRangeEnd.toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {d.r2Key ? (
                    <a
                      className="text-amber-200/90 hover:text-amber-100"
                      href={`/api/accountant/download?key=${encodeURIComponent(d.r2Key)}`}
                    >
                      Download
                    </a>
                  ) : (
                    <span className="text-white/35">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
