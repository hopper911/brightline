import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Automation Run · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

function entityLink(entityType: string | null, entityId: string | null): string | null {
  if (!entityType || !entityId) return null;
  const t = entityType.toLowerCase();
  if (t === "studioproject") return `/admin/projects/${entityId}/edit`;
  if (t === "studioclient") return `/admin/clients/${entityId}`;
  if (t === "gallery") return `/admin/galleries/${entityId}`;
  if (t === "workproject") return `/admin/work/${entityId}`;
  if (t === "mediaasset") return `/admin/media/${entityId}`;
  if (t === "studiolead") return `/admin/studio-leads/${entityId}`;
  return null;
}

export default async function AdminAutomationRunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login");

  const { id } = await params;

  const run = await prisma.automationRun.findUnique({ where: { id } });
  if (!run) notFound();

  const link = entityLink(run.entityType, run.entityId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <Link
        href="/admin/automations"
        className="text-xs uppercase tracking-[0.25em] text-white/50 hover:text-white/80"
      >
        ← Automations
      </Link>

      <p className="mt-6 text-xs uppercase tracking-[0.35em] text-white/50">
        Studio OS
      </p>
      <h1 className="mt-2 font-display text-4xl text-white">Automation run</h1>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/80">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Workflow</p>
            <p className="mt-1">{run.workflowName}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Status</p>
            <p className="mt-1">{run.status}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Trigger</p>
            <p className="mt-1">{run.triggerType ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Entity</p>
            <p className="mt-1">
              {run.entityType ? `${run.entityType}${run.entityId ? ` · ${run.entityId}` : ""}` : "—"}
            </p>
            {link ? (
              <Link href={link} className="mt-1 inline-block text-xs text-white/60 underline">
                Open entity
              </Link>
            ) : null}
          </div>
        </div>

        {run.message ? (
          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Message</p>
            <p className="mt-2 whitespace-pre-wrap text-white/80">{run.message}</p>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Started</p>
            <p className="mt-1">{run.startedAt.toISOString()}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Finished</p>
            <p className="mt-1">{run.finishedAt ? run.finishedAt.toISOString() : "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

