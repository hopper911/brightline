import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import StudioProjectCaseStudy from "@/components/studio/StudioProjectCaseStudy";
import { hasAdminAccess } from "@/lib/admin-auth";
import {
  enrichStudioProjectWithGalleryMedia,
  getStudioProjectRecordById,
} from "@/lib/studio/studio-project-cms";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Studio project preview · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export default async function AdminStudioProjectPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login");

  const { id } = await params;
  const row = await getStudioProjectRecordById(id);
  if (!row) notFound();

  const project = await enrichStudioProjectWithGalleryMedia(row);
  const liveHref = project.published ? `/work/${project.slug}` : null;

  return (
    <div className="min-h-screen bg-[var(--bg-ink-950,#0a0a0a)] text-white">
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-10">
        <div className="mb-6 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-5 py-4">
          <p className="text-[0.65rem] uppercase tracking-[0.28em] text-amber-100/80">
            Admin preview · {project.published ? "Published" : "Draft"} · Studio case study
          </p>
          <p className="mt-2 text-sm text-white/75">
            Same layout as the public Work page. You can preview with missing fields — empty
            sections stay hidden until filled.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href={`/admin/projects/${project.id}/edit`} className="btn btn-ghost text-xs">
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

      <StudioProjectCaseStudy
        project={project}
        adjacent={{ prev: null, next: null }}
      />
    </div>
  );
}
