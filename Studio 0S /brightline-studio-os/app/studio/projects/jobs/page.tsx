import { PageShell } from "@/components/studio/PageShell";
import { JobsRoom } from "../JobsRoom";

export const metadata = {
  title: "Jobs | Projects | Bright Line Studio OS",
  description: "Background jobs, summaries and reminders.",
};

export default function JobsPage() {
  return (
    <PageShell
      title="Background jobs"
      subtitle="Safe local jobs: summaries and reminders. No file changes or external systems."
    >
      <JobsRoom />
    </PageShell>
  );
}
