import { PageShell } from "@/components/studio/PageShell";
import { ProjectForm } from "../ProjectForm";

export const metadata = {
  title: "New project | Bright Line Studio OS",
  description: "Create a new project.",
};

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const params = await searchParams;
  return (
    <PageShell title="New project" subtitle="Create a new project.">
      <ProjectForm clientId={params.clientId} />
    </PageShell>
  );
}
