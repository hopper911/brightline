import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import AdminLogoutButton from "./logout-button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin · BRIGHTLINE Photography",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) {
    redirect("/admin/login");
  }

  let stats: {
    activeLeads: number;
    activeProjects: number;
    mediaAwaitingReview: number;
    proofReadyProjects: number;
    deliveredProjects: number;
    publishedWork: number;
    recentAutomationRuns: Array<{
      id: string;
      workflowName: string;
      status: string;
      startedAt: Date;
      finishedAt: Date | null;
      entityType: string | null;
      entityId: string | null;
    }>;
  } | null = null;

  try {
    const [
      activeLeads,
      activeProjects,
      mediaAwaitingReview,
      proofReadyProjects,
      deliveredProjects,
      publishedWork,
      recentAutomationRuns,
    ] = await Promise.all([
      prisma.studioLead.count({
        where: { status: { notIn: ["LOST", "ARCHIVED"] } },
      }),
      prisma.studioProject.count({
        where: { status: { not: "ARCHIVED" } },
      }),
      prisma.studioMedia.count({
        where: {
          visibility: "INTERNAL",
          OR: [{ isApprovedForWork: false }, { isApprovedForPortfolio: false }],
        },
      }),
      prisma.studioProject.count({ where: { status: "PROOF_READY" } }),
      prisma.studioProject.count({ where: { status: "DELIVERED" } }),
      prisma.workCaseStudy.count({
        where: { OR: [{ status: "PUBLISHED" }, { publishedAt: { not: null } }] },
      }),
      prisma.automationRun.findMany({
        orderBy: { startedAt: "desc" },
        take: 8,
        select: {
          id: true,
          workflowName: true,
          status: true,
          startedAt: true,
          finishedAt: true,
          entityType: true,
          entityId: true,
        },
      }),
    ]);
    stats = {
      activeLeads,
      activeProjects,
      mediaAwaitingReview,
      proofReadyProjects,
      deliveredProjects,
      publishedWork,
      recentAutomationRuns,
    };
  } catch {
    stats = null;
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-6xl flex-col px-4 py-16">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.35em] text-white/50">
          Studio OS Dashboard
        </p>
        <h1 className="font-display text-4xl text-white">Admin</h1>
        <p className="text-base text-white/70">
          Operational overview across leads, projects, media, and automations.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">
            Active leads
          </p>
          <p className="mt-2 text-3xl text-white">
            {stats ? stats.activeLeads : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">
            Active projects
          </p>
          <p className="mt-2 text-3xl text-white">
            {stats ? stats.activeProjects : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">
            Media awaiting review
          </p>
          <p className="mt-2 text-3xl text-white">
            {stats ? stats.mediaAwaitingReview : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">
            Proof-ready projects
          </p>
          <p className="mt-2 text-3xl text-white">
            {stats ? stats.proofReadyProjects : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">
            Delivered projects
          </p>
          <p className="mt-2 text-3xl text-white">
            {stats ? stats.deliveredProjects : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">
            Published work
          </p>
          <p className="mt-2 text-3xl text-white">
            {stats ? stats.publishedWork : "—"}
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/studio" className="btn btn-primary">
          Mission Control
        </Link>
        <Link href="/studio/finance" className="btn btn-primary">
          Finance
        </Link>
        <Link href="/admin/studio-leads" className="btn btn-primary">
          Studio leads
        </Link>
        <Link href="/admin/projects" className="btn btn-primary">
          Studio CMS
        </Link>
        <Link href="/admin/services" className="btn btn-primary">
          Service pages
        </Link>
        <Link href="/admin/pages" className="btn btn-primary">
          Website pages
        </Link>
        <Link href="/admin/hero-showcase" className="btn btn-primary">
          Hero showcase
        </Link>
        <Link href="/admin/blog" className="btn btn-primary">
          Blog
        </Link>
        <Link href="/admin/service-sections" className="btn btn-primary">
          Service sections
        </Link>
        <Link href="/admin/media" className="btn btn-primary">
          Media
        </Link>
        <Link href="/admin/galleries" className="btn btn-ghost">
          Galleries
        </Link>
        <Link href="/admin/work" className="btn btn-ghost">
          Work
        </Link>
        <Link href="/admin/portfolio" className="btn btn-ghost">
          Portfolio
        </Link>
        <Link href="/admin/analytics" className="btn btn-ghost">
          Analytics
        </Link>
        <Link href="/admin/automations" className="btn btn-ghost">
          Automations
        </Link>
        <Link href="/admin/clients" className="btn btn-ghost">
          Clients
        </Link>
        <Link href="/admin/settings" className="btn btn-ghost">
          Settings
        </Link>
      </div>

      <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">
            Recent automation runs
          </p>
          <Link href="/admin/automations" className="text-xs text-white/70 underline hover:text-white">
            View all
          </Link>
        </div>
        {stats && stats.recentAutomationRuns.length > 0 ? (
          <div className="mt-4 space-y-2">
            {stats.recentAutomationRuns.map((run) => (
              <div
                key={run.id}
                className="flex flex-col gap-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-white/85">{run.workflowName}</p>
                  <p className="text-xs text-white/50">
                    {run.entityType ? `${run.entityType}${run.entityId ? ` · ${run.entityId}` : ""}` : "—"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-white/70">
                    {run.status}
                  </span>
                  <span className="text-xs text-white/50">
                    {run.startedAt.toISOString().slice(0, 10)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-white/60">No automation runs yet.</p>
        )}
      </div>

      <div className="mt-8">
        <AdminLogoutButton />
      </div>
    </div>
  );
}
