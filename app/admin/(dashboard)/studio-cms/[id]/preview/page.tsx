import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SharedWorkProjectView from "@/components/work/SharedWorkProjectView";
import { getHubProject, isStudioHubConfigured } from "@/lib/dual-brand/studio-hub";

export const metadata: Metadata = {
  title: "Admin · Brightline shared preview",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

/**
 * Authenticated preview of the Brightline shared collaboration page.
 * Works even when “Publish on Brightline Work” is off (public /work/shared 404s until published).
 */
export default async function StudioCmsBrightlinePreviewPage({ params }: Props) {
  const { id } = await params;
  if (!isStudioHubConfigured()) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-white/70">
        Studio hub is not configured.
      </div>
    );
  }

  let project = null;
  try {
    project = await getHubProject(id);
  } catch {
    project = null;
  }
  if (!project) notFound();

  return (
    <div className="min-h-screen bg-[var(--color-bg,#07090b)] text-white">
      <div className="border-b border-white/10 px-6 py-4">
        <Link
          href={`/admin/studio-cms/${encodeURIComponent(id)}`}
          className="text-xs uppercase tracking-[0.18em] text-white/50 hover:text-white"
        >
          ← Back to Studio CMS
        </Link>
      </div>
      <SharedWorkProjectView project={project} previewBanner />
    </div>
  );
}
