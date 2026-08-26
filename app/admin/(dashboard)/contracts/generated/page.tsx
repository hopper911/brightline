import Link from "next/link";
import { redirect } from "next/navigation";
import { GeneratedDocumentStatus } from "@prisma/client";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Generated documents · Contracts · Admin",
  robots: { index: false, follow: false },
};

export default async function AdminGeneratedDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  if (!(await hasAdminAccess())) redirect("/admin/login");
  const sp = await searchParams;
  const status = sp.status as GeneratedDocumentStatus | undefined;
  const where = status && Object.values(GeneratedDocumentStatus).includes(status) ? { status } : {};

  const rows = await prisma.generatedDocument.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      template: { select: { title: true, type: true } },
      studioClient: { select: { companyName: true } },
      studioProject: { select: { title: true, slug: true } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 text-white">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">
            <Link href="/admin/contracts" className="hover:text-white">
              Contracts
            </Link>{" "}
            / Generated
          </p>
          <h1 className="mt-2 font-display text-3xl">Generated documents</h1>
        </div>
        <Link href="/admin/contracts/generated/new" className="btn btn-primary">
          Generate
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        <FilterLink current={!sp.status} href="/admin/contracts/generated">
          All
        </FilterLink>
        {(
          [
            GeneratedDocumentStatus.GENERATED,
            GeneratedDocumentStatus.SENT,
            GeneratedDocumentStatus.SIGNED,
            GeneratedDocumentStatus.DRAFT,
          ] as const
        ).map((s) => (
          <FilterLink key={s} current={sp.status === s} href={`/admin/contracts/generated?status=${s}`}>
            {s}
          </FilterLink>
        ))}
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-white/50">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
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
                <td className="px-4 py-3 text-white/60">{d.createdAt.toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/contracts/generated/${d.id}`} className="text-amber-200/90 hover:text-amber-100">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-white/50">
                  No documents yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterLink({
  href,
  current,
  children,
}: {
  href: string;
  current: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 ${
        current ? "border-amber-400/50 bg-amber-400/10 text-amber-100" : "border-white/15 text-white/70 hover:border-white/30"
      }`}
    >
      {children}
    </Link>
  );
}
