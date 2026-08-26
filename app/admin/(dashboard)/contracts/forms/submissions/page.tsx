import Link from "next/link";
import { redirect } from "next/navigation";
import { FormSubmissionStatus } from "@prisma/client";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Form submissions · Admin",
  robots: { index: false, follow: false },
};

export default async function FormSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  if (!(await hasAdminAccess())) redirect("/admin/login");
  const sp = await searchParams;
  const st = sp.status;
  const where =
    st === FormSubmissionStatus.DRAFT || st === FormSubmissionStatus.SUBMITTED
      ? { status: st as FormSubmissionStatus }
      : undefined;

  const rows = await prisma.formSubmission.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      formTemplate: { select: { title: true } },
      studioClient: { select: { companyName: true } },
      values: { include: { field: true } },
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 text-white">
      <p className="text-xs uppercase tracking-[0.35em] text-white/50">
        <Link href="/admin/contracts/forms" className="hover:text-white">
          Forms
        </Link>{" "}
        / Submissions
      </p>
      <h1 className="mt-2 font-display text-3xl">Submissions</h1>
      <div className="mt-6 flex gap-2 text-sm">
        <Link href="/admin/contracts/forms/submissions" className="text-amber-200/90">
          All
        </Link>
        <Link href="/admin/contracts/forms/submissions?status=SUBMITTED" className="text-white/60">
          Submitted
        </Link>
        <Link href="/admin/contracts/forms/submissions?status=DRAFT" className="text-white/60">
          Draft
        </Link>
      </div>
      <ul className="mt-8 space-y-6">
        {rows.map((s) => (
          <li key={s.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-medium">{s.formTemplate.title}</span>
              <span className="text-xs text-white/50">{s.status}</span>
            </div>
            <p className="mt-1 text-sm text-white/60">{s.studioClient.companyName}</p>
            {s.status === "SUBMITTED" && s.values.length > 0 && (
              <dl className="mt-3 space-y-1 text-sm">
                {s.values.map((v) => (
                  <div key={v.id} className="flex gap-2">
                    <dt className="text-white/50">{v.field.label}</dt>
                    <dd className="text-white/90">{v.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="mt-8 text-white/50">No submissions.</p>}
    </div>
  );
}
