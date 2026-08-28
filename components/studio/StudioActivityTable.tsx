import Link from "next/link";
import type { StudioAuditEventView } from "@/lib/studio/activity/list-studio-activity";

type Props = {
  events: StudioAuditEventView[];
  nextCursor?: string;
  filterQuery: string;
};

function outcomeLabel(succeeded: boolean | null): string {
  if (succeeded === true) return "Success";
  if (succeeded === false) return "Failed";
  return "—";
}

function outcomeClass(succeeded: boolean | null): string {
  if (succeeded === true) return "text-emerald-300";
  if (succeeded === false) return "text-red-300";
  return "text-white/45";
}

export function StudioActivityTable({ events, nextCursor, filterQuery }: Props) {
  if (!events.length) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-8 text-sm text-white/60">
        No audit events match these filters.
      </p>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10">
        {events.map((event) => (
          <li key={event.id} className="bg-white/[0.03] px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link
                  href={`/studio/activity/${event.id}`}
                  className="text-base text-white hover:underline"
                >
                  {event.action}
                </Link>
                <p className="mt-1 text-xs text-white/45">
                  {event.tenantSlug} · {event.actorType}
                  {event.actorId ? ` · ${event.actorId}` : ""}
                </p>
                {event.resourceType ? (
                  <p className="mt-1 text-xs text-white/40">
                    {event.resourceType}
                    {event.resourceId ? ` / ${event.resourceId}` : ""}
                  </p>
                ) : null}
              </div>
              <div className="text-right text-xs">
                <p className={outcomeClass(event.succeeded)}>{outcomeLabel(event.succeeded)}</p>
                <p className="mt-1 text-white/40">{new Date(event.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {nextCursor ? (
        <div className="mt-4">
          <Link
            href={`/studio/activity?${filterQuery}${filterQuery ? "&" : ""}cursor=${encodeURIComponent(nextCursor)}`}
            className="inline-block rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70 hover:text-white"
          >
            Next page →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
