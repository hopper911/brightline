"use client";

type Props = {
  published: boolean;
  className?: string;
};

export function ProjectStatusBadge({ published, className }: Props) {
  return (
    <span
      className={
        className ??
        `inline-flex rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${
          published ? "bg-emerald-500/15 text-emerald-900" : "bg-black/10 text-black/70"
        }`
      }
    >
      {published ? "Published" : "Draft"}
    </span>
  );
}
