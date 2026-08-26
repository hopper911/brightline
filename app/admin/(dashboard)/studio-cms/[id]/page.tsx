import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StudioHubEditor from "@/components/admin/StudioHubEditor";
import { getHubProject, isStudioHubConfigured } from "@/lib/dual-brand/studio-hub";

export const metadata: Metadata = {
  title: "Admin · Studio CMS project",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function StudioCmsProjectPage({ params }: Props) {
  const { id } = await params;
  if (!isStudioHubConfigured()) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-white/70">
        Studio hub is not configured. Set CONTENT_API_SECRET or MIROTECH_ADMIN_HANDOFF_SECRET on
        Brightline so it can reach Mirotech.
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
  return <StudioHubEditor initial={project} />;
}
