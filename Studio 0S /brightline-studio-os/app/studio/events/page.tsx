import { PageShell } from "@/components/studio/PageShell";
import { EventFeed } from "@/components/studio/EventFeed";
import { EmptyState } from "@/components/studio/EmptyState";
import { getEvents } from "@/lib/events/logger";

export default function EventsPage() {
  const events = getEvents();

  return (
    <PageShell
      title="Events"
      subtitle="Workflow and timeline. Newest first."
    >
      {events.length > 0 ? (
        <EventFeed events={events} />
      ) : (
        <EmptyState
          title="No events yet"
          description="Use Reception or Marketing to generate activity. Events will appear here."
        />
      )}
    </PageShell>
  );
}
