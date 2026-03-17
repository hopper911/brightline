import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, subtitle, action, className = "" }: SectionHeaderProps) {
  return (
    <div className={`flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div>
        <h2 className="font-display text-sm font-medium uppercase tracking-[0.2em] text-white/55">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-white/40">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
