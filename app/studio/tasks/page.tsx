import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { TasksWorkspace } from "./TasksWorkspace";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tasks · Studio OS · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export default async function StudioTasksPage() {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login?next=%2Fstudio%2Ftasks");

  const [projects, clients] = await Promise.all([
    prisma.studioProject.findMany({
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: { id: true, title: true, client: true, clientId: true },
    }),
    prisma.studioClient.findMany({
      where: { isActive: true },
      orderBy: { companyName: "asc" },
      take: 300,
      select: { id: true, companyName: true },
    }),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/studio" className="text-xs uppercase tracking-[0.25em] text-white/45 hover:text-white/80">
            Mission Control
          </Link>
          <h1 className="mt-3 font-display text-4xl text-white">Tasks</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/65">
            Lightweight production tasks — list, board, and timeline by due week.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/studio/calendar" className="btn btn-ghost text-xs">
            Calendar
          </Link>
          <Link href="/studio" className="btn btn-primary text-xs">
            Overview
          </Link>
        </div>
      </div>

      <div className="mt-10">
        <TasksWorkspace
          projects={projects.map((p) => ({
            id: p.id,
            title: p.title,
            client: p.client,
            clientId: p.clientId,
          }))}
          clients={clients}
        />
      </div>
    </main>
  );
}
