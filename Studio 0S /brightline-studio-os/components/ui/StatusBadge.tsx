import type { RoomStatus } from "@/lib/studio/mockData";

const STATUS_STYLES: Record<RoomStatus, { dot: string; pill: string; label: string }> = {
  green: {
    dot: "bg-emerald-400/90",
    pill: "border-emerald-400/20 bg-emerald-400/5 text-emerald-300/90",
    label: "Flowing",
  },
  amber: {
    dot: "bg-amber-400/90",
    pill: "border-amber-400/20 bg-amber-400/5 text-amber-300/90",
    label: "Attention",
  },
  red: {
    dot: "bg-rose-400/90",
    pill: "border-rose-400/20 bg-rose-400/5 text-rose-300/90",
    label: "Overloaded",
  },
  blue: {
    dot: "bg-slate-400/90",
    pill: "border-slate-400/20 bg-slate-400/5 text-slate-300/90",
    label: "In motion",
  },
};

interface StatusBadgeProps {
  status: RoomStatus;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const { dot, pill, label } = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] ${pill} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      {label}
    </span>
  );
}
