import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getFinanceOverview } from "@/lib/studio/finance";
import { computeStudioPriorities } from "@/lib/studio/priorityEngine";
import { getEmailProviderStatus } from "@/lib/integrations/emailProvider";
import { MissionControlEmailPanel } from "@/components/studio/MissionControlEmailPanel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mission Control · Studio OS · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

function money(value: { toString(): string }) {
  return Number(value.toString()).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5">
      <div className="border-b border-white/10 px-5 py-4">
        <h2 className="font-display text-xl text-white">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default async function StudioMissionControlPage() {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login?next=%2Fstudio");

  const emailStatus = getEmailProviderStatus();

  const [
    finance,
    leads,
    projects,
    clients,
    recentPayments,
    recentExpenses,
    emailAccount,
    emailThreads,
  ] = await Promise.all([
    getFinanceOverview(),
    prisma.studioLead.findMany({
      where: { convertedProjectId: null },
      orderBy: [{ followUpDate: "asc" }, { createdAt: "desc" }],
      take: 40,
      select: {
        id: true,
        name: true,
        company: true,
        status: true,
        followUpDate: true,
        createdAt: true,
        convertedProjectId: true,
      },
    }),
    prisma.studioProject.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        slug: true,
        client: true,
        status: true,
        deliveryDate: true,
        updatedAt: true,
        totalPrice: true,
        amountPaid: true,
        balanceRemaining: true,
        paymentStatus: true,
        contentStatus: true,
        contentPosted: true,
        reusableLater: true,
        isPublicReady: true,
      },
    }),
    prisma.studioClient.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
      take: 80,
      select: {
        id: true,
        companyName: true,
        followUpStatus: true,
        followUpAt: true,
        _count: { select: { projects: true } },
      },
    }),
    prisma.studioPayment.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { project: { select: { title: true } } },
    }),
    prisma.studioExpense.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { project: { select: { title: true } } },
    }),
    emailStatus.emailAddress
      ? prisma.studioEmailAccount.findFirst({
          where: {
            emailAddress: { equals: emailStatus.emailAddress, mode: "insensitive" },
          },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            emailAddress: true,
            displayName: true,
            lastSyncedAt: true,
          },
        })
      : Promise.resolve(null),
    prisma.studioEmailThread.findMany({
      orderBy: { lastMessageAt: "desc" },
      take: 8,
      select: {
        id: true,
        subject: true,
        fromName: true,
        fromEmail: true,
        snippet: true,
        lastMessageAt: true,
        unread: true,
        matchedClientId: true,
        matchedLeadId: true,
        matchedProjectId: true,
      },
    }),
  ]);

  const priorities = computeStudioPriorities({
    leads,
    projects,
    clients: clients.map((client) => ({
      id: client.id,
      companyName: client.companyName,
      followUpStatus: client.followUpStatus,
      followUpAt: client.followUpAt,
      projectsCount: client._count.projects,
    })),
    emailThreads,
  });

  const activeProjects = projects.filter(
    (project) => project.status !== "ARCHIVED" && project.status !== "PUBLISHED"
  );
  const recentActivity = [
    ...recentPayments.map((payment) => ({
      id: `payment-${payment.id}`,
      label: `Payment received: ${payment.project.title}`,
      amount: money(payment.amount),
      date: payment.createdAt,
    })),
    ...recentExpenses.map((expense) => ({
      id: `expense-${expense.id}`,
      label: `Expense logged: ${expense.category}`,
      amount: money(expense.amount),
      date: expense.createdAt,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 8);

  return (
    <main className="mx-auto max-w-7xl px-4 py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Studio OS</p>
          <h1 className="mt-3 font-display text-4xl text-white">Mission Control</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/65">
            Daily command center for projects, finance, client memory, and marketing opportunities.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/studio/finance" className="btn btn-primary">Finance</Link>
          <Link href="/studio/invoices" className="btn btn-ghost">Invoices</Link>
          <Link href="/admin/studio-leads" className="btn btn-ghost">Studio leads</Link>
          <Link href="/admin/projects" className="btn btn-ghost">Studio CMS</Link>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-white/50">Active Projects</p>
          <p className="mt-2 text-3xl text-white">{activeProjects.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-white/50">Revenue MTD</p>
          <p className="mt-2 text-3xl text-white">{money(finance.summary.revenueThisMonth)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-white/50">Profit Est.</p>
          <p className="mt-2 text-3xl text-white">{money(finance.summary.estimatedProfit)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-white/50">Outstanding</p>
          <p className="mt-2 text-3xl text-white">{money(finance.summary.outstandingBalance)}</p>
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Today's Focus">
          <div className="space-y-3">
            {priorities.todayFocus.length === 0 ? (
              <p className="text-sm text-white/55">No urgent focus items right now.</p>
            ) : (
              priorities.todayFocus.map((item) => (
                <Link key={`${item.title}-${item.entityId}`} href={item.href ?? "/studio"} className="block rounded-xl border border-white/10 bg-black/20 p-3 hover:bg-white/10">
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-white/55">{item.detail}</p>
                </Link>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Active Projects">
          <div className="space-y-3">
            {activeProjects.slice(0, 8).map((project) => (
              <Link key={project.id} href={`/admin/projects/${project.id}/edit`} className="grid grid-cols-12 gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm hover:bg-white/10">
                <div className="col-span-7">
                  <p className="truncate text-white">{project.title}</p>
                  <p className="text-xs text-white/45">{project.client}</p>
                </div>
                <div className="col-span-3 text-white/55">{project.status}</div>
                <div className="col-span-2 text-right text-white/55">{project.contentStatus}</div>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title="Recent Activity">
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-white/55">No recent finance activity.</p>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                  <div>
                    <p className="text-white">{activity.label}</p>
                    <p className="text-xs text-white/45">{activity.date.toLocaleString()}</p>
                  </div>
                  <p className="font-medium text-white">{activity.amount}</p>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Email">
          <MissionControlEmailPanel
            status={emailStatus}
            account={
              emailAccount
                ? {
                    ...emailAccount,
                    lastSyncedAt: emailAccount.lastSyncedAt?.toISOString() ?? null,
                  }
                : null
            }
            unreadCount={emailThreads.filter((thread) => thread.unread).length}
            threads={emailThreads.map((thread) => ({
              id: thread.id,
              subject: thread.subject,
              fromName: thread.fromName,
              fromEmail: thread.fromEmail,
              snippet: thread.snippet,
              lastMessageAt: thread.lastMessageAt.toISOString(),
              unread: thread.unread,
              href: thread.matchedLeadId
                ? `/admin/studio-leads/${thread.matchedLeadId}`
                : thread.matchedClientId
                  ? `/admin/clients/${thread.matchedClientId}`
                  : thread.matchedProjectId
                    ? `/admin/projects/${thread.matchedProjectId}/edit`
                    : null,
            }))}
          />
        </Panel>

        <Panel title="Risks">
          <div className="space-y-3">
            {priorities.risks.length === 0 ? (
              <p className="text-sm text-white/55">No major risks detected.</p>
            ) : (
              priorities.risks.map((item) => (
                <Link key={`${item.title}-${item.entityId}`} href={item.href ?? "/studio"} className="block rounded-xl border border-red-400/20 bg-red-500/10 p-3 hover:bg-red-500/15">
                  <p className="text-sm font-medium text-red-100">{item.title}</p>
                  <p className="mt-1 text-xs text-red-100/65">{item.detail}</p>
                </Link>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Opportunities">
          <div className="space-y-3">
            {priorities.opportunities.length === 0 ? (
              <p className="text-sm text-white/55">No opportunities queued.</p>
            ) : (
              priorities.opportunities.map((item) => (
                <Link key={`${item.title}-${item.entityId}`} href={item.href ?? "/studio"} className="block rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 hover:bg-emerald-500/15">
                  <p className="text-sm font-medium text-emerald-100">{item.title}</p>
                  <p className="mt-1 text-xs text-emerald-100/65">{item.detail}</p>
                </Link>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Suggestions">
          <div className="space-y-3">
            {priorities.suggestions.length === 0 ? (
              <p className="text-sm text-white/55">No suggestions yet.</p>
            ) : (
              priorities.suggestions.map((item) => (
                <Link key={`${item.title}-${item.entityId}`} href={item.href ?? "/studio"} className="block rounded-xl border border-white/10 bg-black/20 p-3 hover:bg-white/10">
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-white/55">{item.detail}</p>
                </Link>
              ))
            )}
          </div>
        </Panel>
      </div>
    </main>
  );
}
