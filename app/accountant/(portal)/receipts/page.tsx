import { redirect } from "next/navigation";
import { getAccountantPortalContext } from "@/lib/accountant/auth";
import { ReceiptUploader } from "@/components/accountant/ReceiptUploader";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AccountantReceiptsPage() {
  const ctx = await getAccountantPortalContext();
  if (!ctx) redirect("/accountant/login");
  if (!ctx.permissions.canUploadReceipts && !ctx.permissions.canViewExpenses) redirect("/accountant");

  const receipts = await prisma.accountingReceipt.findMany({
    orderBy: { createdAt: "desc" },
    take: 80,
    select: {
      id: true,
      fileName: true,
      r2Key: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
      studioExpenseId: true,
    },
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl text-white">Receipts</h1>
        <p className="mt-1 text-sm text-white/55">Private files attached to the accounting ledger.</p>
      </header>

      {ctx.permissions.canUploadReceipts ? <ReceiptUploader /> : null}

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-white/45">
            <tr>
              <th className="px-4 py-3">Uploaded</th>
              <th className="px-4 py-3">File</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Expense id</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="text-white/80">
            {receipts.map((r) => (
              <tr key={r.id} className="border-b border-white/5">
                <td className="px-4 py-3 text-white/60">{r.createdAt.toLocaleString()}</td>
                <td className="max-w-xs truncate px-4 py-3">{r.fileName}</td>
                <td className="px-4 py-3 text-xs text-white/50">{r.mimeType}</td>
                <td className="px-4 py-3 font-mono text-xs text-white/50">{r.studioExpenseId ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  {ctx.permissions.canDownloadDocuments ? (
                    <a
                      className="text-amber-200/90 hover:text-amber-100"
                      href={`/api/accountant/download?key=${encodeURIComponent(r.r2Key)}`}
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
