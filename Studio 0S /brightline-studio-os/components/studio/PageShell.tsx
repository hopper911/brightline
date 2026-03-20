import Link from "next/link";
import type { ReactNode } from "react";

interface PageShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  maxWidth?: "md" | "lg" | "xl";
}

export function PageShell({ title, subtitle, children, maxWidth = "xl" }: PageShellProps) {
  const maxWidthClasses = {
    md: "max-w-xl",
    lg: "max-w-2xl",
    xl: "max-w-3xl",
  };

  return (
    <div className="min-h-screen bg-studio-bg p-6 text-white sm:p-8">
      <div className={`mx-auto ${maxWidthClasses[maxWidth]}`}>
        <Link
          href="/studio/dashboard"
          className="text-xs font-medium tracking-[0.1em] text-white/45 transition-colors hover:text-white/70"
        >
          ← Studio
        </Link>
        <h1 className="mt-4 font-display text-2xl font-medium tracking-tight text-white/95 sm:text-[1.75rem]">
          {title}
        </h1>
        <p className="mt-2 text-sm text-white/55">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
