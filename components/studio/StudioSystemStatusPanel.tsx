import type { StudioSystemStatusSnapshot } from "@/lib/studio/activity/system-status";

type Props = {
  status: StudioSystemStatusSnapshot;
};

function tone(status: string): string {
  if (status === "ok") return "text-emerald-300";
  if (status === "disabled") return "text-white/45";
  if (status === "degraded") return "text-amber-200";
  return "text-red-300";
}

export function StudioSystemStatusPanel({ status }: Props) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-medium text-white">System status</p>
        <p className="text-xs text-white/40">Updated {new Date(status.ts).toLocaleString()}</p>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {status.components.map((component) => (
          <li
            key={component.id}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
          >
            <p className="text-white/80">{component.label}</p>
            <p className={`mt-0.5 text-xs ${tone(component.status)}`}>{component.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
