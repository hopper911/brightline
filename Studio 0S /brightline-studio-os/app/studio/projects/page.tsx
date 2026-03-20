import Link from "next/link";
import { PageShell } from "@/components/studio/PageShell";
import { ProjectsList } from "./ProjectsList";

export const metadata = {
  title: "Projects | Bright Line Studio OS",
  description: "Projects and shoot management.",
};

export default function ProjectsPage() {
  return (
    <PageShell title="Projects" subtitle="Projects and shoot management.">
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/studio/projects/new"
            className="rounded-studio-base border border-accent-border bg-accent/10 px-4 py-2 text-sm font-medium text-white/95 transition-colors hover:bg-accent/15"
          >
            New project
          </Link>
          <Link
            href="/studio/projects/jobs"
            className="rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/[0.05]"
          >
            Background jobs
          </Link>
        </div>
        <ProjectsList />
      </div>
    </PageShell>
  );
}
