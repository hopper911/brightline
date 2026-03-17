import type { ReactNode } from "react";

interface PanelProps {
  children: ReactNode;
  className?: string;
  as?: "section" | "aside" | "div";
  padding?: "none" | "sm" | "base" | "lg";
  role?: string;
}

export function Panel({ children, className = "", as: Tag = "div", padding = "base", role }: PanelProps) {
  const paddingClasses = {
    none: "",
    sm: "p-4",
    base: "p-5 sm:p-6",
    lg: "p-6 sm:p-8",
  };

  return (
    <Tag
      className={`rounded-studio-xl border border-white/[0.05] bg-white/[0.02] shadow-studio transition-[border-color,background-color] duration-200 hover:border-white/[0.08] hover:bg-white/[0.03] ${paddingClasses[padding]} ${className}`}
      role={role}
    >
      {children}
    </Tag>
  );
}
