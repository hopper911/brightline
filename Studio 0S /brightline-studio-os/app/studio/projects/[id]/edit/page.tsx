import { notFound } from "next/navigation";
import { PageShell } from "@/components/studio/PageShell";
import { ProjectForm } from "../../ProjectForm";

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

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  return (
    <PageShell title="Edit project" subtitle={project.name}>
      <ProjectForm project={project} />
    </PageShell>
  );
}
