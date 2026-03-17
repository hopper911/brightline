import type { ReactNode } from "react";

interface ActivityItemProps {
  meta: ReactNode;
  summary: string;
  className?: string;
}

export function ActivityItem({ meta, summary, className = "" }: ActivityItemProps) {
  return (
    <li
      className={`rounded-studio-base border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 text-sm transition-[border-color] duration-180 hover:border-accent-border ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-[0.15em] text-white/45">
        {meta}
      </div>
      <p className="mt-1.5 text-white/85 leading-relaxed">{summary}</p>
    </li>
  );
}
