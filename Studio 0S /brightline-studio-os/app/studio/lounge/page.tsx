import { PageShell } from "@/components/studio/PageShell";
import { EmptyState } from "@/components/studio/EmptyState";

export default function LoungePage() {
  return (
    <PageShell
      title="Client Lounge"
      subtitle="Client experience. Preferences, lookbooks, and pre-session touchpoints."
    >
      <EmptyState
        title="Coming soon"
        description="Client profiles and lookbook management will be available here."
      />
    </PageShell>
  );
}
