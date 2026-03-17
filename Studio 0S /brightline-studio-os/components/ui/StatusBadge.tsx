import type { RoomStatus } from "@/lib/studio/mockData";

const STATUS_STYLES: Record<RoomStatus, { dot: string; pill: string; label: string }> = {
  green: {
    dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]",
    pill: "border-emerald-400/30 bg-emerald-400/5 text-emerald-200",
    label: "Flowing",
  },
  amber: {
    dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]",
    pill: "border-amber-400/30 bg-amber-400/5 text-amber-200",
    label: "Attention",
  },
  red: {
    dot: "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.5)]",
    pill: "border-rose-400/30 bg-rose-400/5 text-rose-200",
    label: "Overloaded",
  },
  blue: {
    dot: "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]",
    pill: "border-sky-400/30 bg-sky-400/5 text-sky-200",
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
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium backdrop-blur-sm ${pill} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      {label}
    </span>
  );
}
