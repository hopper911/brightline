import Link from "next/link";
import { ActivityItem } from "@/components/studio/ActivityItem";
import type { EventRecord } from "@/lib/events/logger";

interface EventFeedProps {
  events: EventRecord[];
  compact?: boolean;
  maxItems?: number;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 60_000) return "Just now";
    if (diffMs < 3600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
    if (diffMs < 86400_000) return `${Math.floor(diffMs / 3600_000)}h ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export function EventFeed({ events, compact = false, maxItems }: EventFeedProps) {
  const list = maxItems != null ? events.slice(0, maxItems) : events;

  if (list.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-2" aria-label="Event feed">
      {list.map((evt) => (
        <ActivityItem
          key={evt.id}
          meta={
            <>
              <span>{formatTime(evt.createdAt)}</span>
              <span className="text-white/35">·</span>
              <span>{evt.room}</span>
              <span className="text-white/35">·</span>
              <span>{evt.agent}</span>
              <span
                className="rounded border border-white/10 px-1.5 py-0.5 text-white/50"
              >
                {evt.status}
              </span>
            </>
          }
          summary={evt.summary}
        />
      ))}
      {compact && events.length > (maxItems ?? 5) && (
        <li className="pt-1">
          <Link
            href="/studio/dashboard/events"
            className="text-xs font-medium uppercase tracking-[0.1em] text-accent transition-colors hover:text-accent-muted"
          >
            View all events
          </Link>
        </li>
      )}
    </ul>
  );
}
