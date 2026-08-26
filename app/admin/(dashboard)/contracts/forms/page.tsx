import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Forms · Contracts · Admin",
  robots: { index: false, follow: false },
};

export default async function AdminFormsHubPage() {
  if (!(await hasAdminAccess())) redirect("/admin/login");
  const [templates, recentSubs] = await Promise.all([
    prisma.formTemplate.findMany({
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { fields: true, submissions: true } } },
    }),
    prisma.formSubmission.findMany({
      orderBy: { updatedAt: "desc" },
      take: 15,
      include: {
        formTemplate: { select: { title: true } },
        studioClient: { select: { companyName: true } },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 text-white">
      <p className="text-xs uppercase tracking-[0.35em] text-white/50">
        <Link href="/admin/contracts" className="hover:text-white">
          Contracts
        </Link>{" "}
        / Forms
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl">Forms</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/contracts/forms/new" className="btn btn-primary">
            New form template
          </Link>
          <Link href="/admin/contracts/forms/submissions" className="btn border border-white/20 bg-white/5">
            All submissions
          </Link>
        </div>
      </div>

      <div className="mt-10 overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-white/50">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Fields</th>
              <th className="px-4 py-3">Assignments</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                <td className="px-4 py-3 font-medium">{t.title}</td>
                <td className="px-4 py-3 text-white/70">{t.type}</td>
                <td className="px-4 py-3 text-white/70">{t._count.fields}</td>
                <td className="px-4 py-3 text-white/70">{t._count.submissions}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/contracts/forms/${t.id}`} className="text-amber-200/90 hover:text-amber-100">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-14 font-display text-2xl">Recent submissions</h2>
      <ul className="mt-4 space-y-2 text-sm text-white/80">
        {recentSubs.map((s) => (
          <li key={s.id}>
            {s.formTemplate.title} — {s.studioClient.companyName} — {s.status}
          </li>
        ))}
        {recentSubs.length === 0 && <li className="text-white/50">No submissions yet.</li>}
      </ul>
    </div>
  );
}
