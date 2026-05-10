import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { CalendarWorkspace, type ProjectDateHint } from "./CalendarWorkspace";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Calendar · Studio OS · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export default async function StudioCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login?next=%2Fstudio%2Fcalendar");

  const sp = await searchParams;
  const now = new Date();
  const initialYear = sp.y ? parseInt(sp.y, 10) : now.getFullYear();
  const initialMonth = sp.m ? parseInt(sp.m, 10) - 1 : now.getMonth();
  if (Number.isNaN(initialYear) || Number.isNaN(initialMonth)) {
    redirect("/studio/calendar");
  }

  const rangeFrom = new Date(initialYear, initialMonth, 1);
  const rangeTo = new Date(initialYear, initialMonth + 3, 0, 23, 59, 59, 999);

  const [projects, clients, withDates] = await Promise.all([
    prisma.studioProject.findMany({
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: { id: true, title: true },
    }),
    prisma.studioClient.findMany({
      where: { isActive: true },
      orderBy: { companyName: "asc" },
      take: 300,
      select: { id: true, companyName: true },
    }),
    prisma.studioProject.findMany({
      where: {
        isCancelled: false,
        OR: [
          { shootDate: { gte: rangeFrom, lte: rangeTo } },
          { deliveryDate: { gte: rangeFrom, lte: rangeTo } },
        ],
      },
      select: { id: true, title: true, slug: true, shootDate: true, deliveryDate: true },
    }),
  ]);

  const projectHints: ProjectDateHint[] = [];
  for (const p of withDates) {
    if (p.shootDate && p.shootDate >= rangeFrom && p.shootDate <= rangeTo) {
      projectHints.push({
        projectId: p.id,
        title: p.title,
        slug: p.slug,
        date: p.shootDate.toISOString(),
        kind: "shoot",
      });
    }
    if (p.deliveryDate && p.deliveryDate >= rangeFrom && p.deliveryDate <= rangeTo) {
      projectHints.push({
        projectId: p.id,
        title: p.title,
        slug: p.slug,
        date: p.deliveryDate.toISOString(),
        kind: "delivery",
      });
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/studio" className="text-xs uppercase tracking-[0.25em] text-white/45 hover:text-white/80">
            Mission Control
          </Link>
          <h1 className="mt-3 font-display text-4xl text-white">Calendar</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/65">
            Schedule shoots and deadlines. Project shoot/delivery dates from CMS appear as read-only hints.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/studio/tasks" className="btn btn-ghost text-xs">
            Tasks
          </Link>
          <Link href="/studio" className="btn btn-primary text-xs">
            Overview
          </Link>
        </div>
      </div>

      <div className="mt-10">
        <CalendarWorkspace
          initialYear={initialYear}
          initialMonth={initialMonth}
          projectHints={projectHints}
          projects={projects}
          clients={clients}
        />
      </div>
    </main>
  );
}
