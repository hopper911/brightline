import type { ReactNode } from "react";
import Link from "next/link";

interface CardRowProps {
  title: string;
  meta?: ReactNode;
  snippet?: string;
  href?: string;
  status?: string;
  as?: "link" | "div";
  children?: ReactNode;
}

/**
 * Standard card row for timelines, result lists, and panels.
 * Use for events, drafts, search results, handoffs.
 */
export function CardRow({ title, meta, snippet, href, status, as = "div", children }: CardRowProps) {
  const baseClass =
    "block rounded-studio-base border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 text-sm transition-[border-color,background-color] hover:border-accent-border hover:bg-white/[0.04]";

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-white/90">{title}</span>
        {status && (
          <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase text-white/50">
            {status}
          </span>
        )}
      </div>
      {meta && (
        <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-white/45">{meta}</div>
      )}
      {(snippet || children) && (
        <p className="mt-1.5 text-white/75 leading-relaxed">{snippet ?? children}</p>
      )}
    </>
  );

  if (as === "link" && href) {
    return (
      <Link href={href} className={baseClass}>
        {content}
      </Link>
    );
  }

  return <div className={baseClass}>{content}</div>;
}
