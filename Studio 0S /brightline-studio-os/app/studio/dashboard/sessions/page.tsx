import { PageShell } from "@/components/studio/PageShell";
import { EmptyState } from "@/components/studio/EmptyState";

export default function SessionsPage() {
  return (
    <PageShell
      title="Sessions"
      subtitle="Shoot sessions and capture pipelines."
    >
      <EmptyState
        title="Coming soon"
        description="Session management will be available here."
      />
    </PageShell>
  );
}
