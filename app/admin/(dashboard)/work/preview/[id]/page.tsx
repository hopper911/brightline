import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import WorkProjectCaseStudy from "@/components/work/WorkProjectCaseStudy";
import { hasAdminAccess } from "@/lib/admin-auth";
import { getWorkProjectByIdForPreview } from "@/lib/queries/work";
import { sectionToPillarSlug, getPillarBySlug } from "@/lib/work-pillar-settings";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Work preview · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export default async function AdminWorkPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login");

  const { id } = await params;
  const project = await getWorkProjectByIdForPreview(id);
  if (!project) notFound();

  let pillarSlug = "work";
  let pillarLabel = "Work";
  try {
    pillarSlug = await sectionToPillarSlug(project.section);
    const pillar = await getPillarBySlug(pillarSlug);
    pillarLabel = pillar?.label ?? pillarSlug;
  } catch {
    // Incomplete / orphaned section mapping — still preview with fallbacks
  }

  const liveHref = project.published
    ? `/work/${pillarSlug}/${project.slug}`
    : null;

  return (
    <div className="min-h-screen bg-[var(--bg-ink-950,#0a0a0a)] text-white">
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-10">
        <div className="mb-6 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-5 py-4">
          <p className="text-[0.65rem] uppercase tracking-[0.28em] text-amber-100/80">
            Admin preview · {project.published ? "Published" : "Draft"} · Work case study
          </p>
          <p className="mt-2 text-sm text-white/75">
            Same layout as the public page. Incomplete drafts are fine — empty sections stay
            hidden. Visitors cannot see this until you publish.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href={`/admin/work/${project.id}`} className="btn btn-ghost text-xs">
              ← Back to editor
            </Link>
            {liveHref ? (
              <Link href={liveHref} className="btn btn-ghost text-xs">
                Open live
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <WorkProjectCaseStudy
        project={project}
        pillarSlug={pillarSlug}
        pillarLabel={pillarLabel}
        includeSchema={false}
      />
    </div>
  );
}
