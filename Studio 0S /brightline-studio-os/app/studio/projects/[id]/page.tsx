import { notFound } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/studio/PageShell";
import { ProjectDetail } from "./ProjectDetail";

async function getProject(id: string) {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/projects/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  return (
    <PageShell title={project.name} subtitle={`Project · ${project.status}`}>
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/studio/projects/${id}/edit`}
            className="rounded-studio-base border border-accent-border bg-accent/10 px-4 py-2 text-sm font-medium text-white/95 transition-colors hover:bg-accent/15"
          >
            Edit
          </Link>
        </div>
        <ProjectDetail project={project} />
      </div>
    </PageShell>
  );
}
