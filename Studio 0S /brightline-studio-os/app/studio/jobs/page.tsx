import { PageShell } from "@/components/studio/PageShell";
import { JobsRoom } from "./JobsRoom";

export const metadata = {
  title: "Background Jobs | Bright Line Studio OS",
  description: "Safe local jobs: summaries and reminders. No automation.",
};

export default function JobsPage() {
  return (
    <PageShell
      title="Background Jobs"
      subtitle="Safe summaries and reminders. Local-first, no file changes or external systems."
    >
      <JobsRoom />
    </PageShell>
  );
}
