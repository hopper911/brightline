import Link from "next/link";
import { redirect } from "next/navigation";
import { GeneratedDocumentStatus, Prisma } from "@prisma/client";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Contracts & forms · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

type DashboardStats =
  | { ok: true; templateCount: number; docCount: number; signedCount: number; formTplCount: number }
  | { ok: false; code: string };

async function loadContractDashboardStats(): Promise<DashboardStats> {
  try {
    const [templateCount, docCount, signedCount, formTplCount] = await Promise.all([
      prisma.documentTemplate.count({ where: { isActive: true } }),
      prisma.generatedDocument.count(),
      prisma.generatedDocument.count({ where: { status: GeneratedDocumentStatus.SIGNED } }),
      prisma.formTemplate.count({ where: { isActive: true } }),
    ]);
    return { ok: true, templateCount, docCount, signedCount, formTplCount };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      const msg = e.message?.toLowerCase() ?? "";
      const missing =
        e.code === "P2021" ||
        msg.includes("does not exist") ||
        (msg.includes("relation") && msg.includes("not exist"));
      if (missing) {
        return { ok: false, code: e.code };
      }
    }
    throw e;
  }
}

export default async function AdminContractsHomePage() {
  if (!(await hasAdminAccess())) redirect("/admin/login");

  const stats = await loadContractDashboardStats();

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 text-white">
      <p className="text-xs uppercase tracking-[0.35em] text-white/50">Mission Control</p>
      <h1 className="mt-2 font-display text-4xl">Contracts &amp; forms</h1>
      <p className="mt-3 max-w-2xl text-sm text-white/70">
        Templates, generated agreements, client signing links, and intake forms. Operational drafts only—have
        counsel review before production use.
      </p>

      {stats.ok === false && (
        <div
          className="mt-8 rounded-xl border border-amber-500/35 bg-amber-500/10 p-5 text-sm text-amber-50/95"
          role="alert"
        >
          <p className="font-medium text-amber-100">Contracts database schema is not on this environment</p>
          <p className="mt-2 text-amber-50/90">
            The production database wired to this deployment is missing Contracts &amp; Forms tables (Prisma{" "}
            <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-xs">{stats.code}</code>). Run migrations
            against the <strong>same</strong> <code className="font-mono text-xs">DATABASE_URL</code> as Vercel
            production, then redeploy if needed:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-black/40 p-3 font-mono text-xs text-white/80">
            DATABASE_URL=&quot;…&quot; DIRECT_URL=&quot;…&quot; npx prisma migrate deploy
          </pre>
          <p className="mt-2 text-xs text-amber-50/70">
            Confirm Vercel Project → Settings → Environment Variables matches the Neon branch you migrated.
          </p>
        </div>
      )}

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-widest text-white/50">Active templates</p>
          <p className="mt-2 font-display text-3xl">{stats.ok ? stats.templateCount : "—"}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-widest text-white/50">Documents</p>
          <p className="mt-2 font-display text-3xl">{stats.ok ? stats.docCount : "—"}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-widest text-white/50">Signed</p>
          <p className="mt-2 font-display text-3xl">{stats.ok ? stats.signedCount : "—"}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-widest text-white/50">Form templates</p>
          <p className="mt-2 font-display text-3xl">{stats.ok ? stats.formTplCount : "—"}</p>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/admin/contracts/templates" className="btn btn-primary">
          Templates
        </Link>
        <Link href="/admin/contracts/generated" className="btn border border-white/20 bg-white/5">
          Generated documents
        </Link>
        <Link href="/admin/contracts/releases" className="btn border border-white/20 bg-white/5">
          Releases
        </Link>
        <Link href="/admin/contracts/forms" className="btn border border-white/20 bg-white/5">
          Forms
        </Link>
        <Link href="/admin/contracts/settings" className="btn border border-white/20 bg-white/5">
          Settings
        </Link>
      </div>
    </div>
  );
}
