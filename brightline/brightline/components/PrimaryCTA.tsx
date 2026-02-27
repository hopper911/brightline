"use client";

import Link from "next/link";

type PrimaryCTAProps = {
  service: string;
  className?: string;
  location?: string;
  children?: React.ReactNode;
};

export default function PrimaryCTA({ service, className, location, children }: PrimaryCTAProps) {
  const href = location ? `/contact?service=${service}&location=${location}` : `/contact?service=${service}`;
  return (
    <Link href={href} className={className || "btn btn-primary"}>
      {children ?? "Start a Project"}
    </Link>
  );
}
