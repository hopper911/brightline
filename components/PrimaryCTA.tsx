"use client";

import Link from "next/link";
import { trackCTAClick } from "@/lib/analytics";

export default function PrimaryCTA({
  service = "general",
  className = "btn btn-primary",
  label = "Request a quote",
  location = "unknown",
}: {
  service?: string;
  className?: string;
  label?: string;
  location?: string;
}) {
  const href = `/contact?service=${encodeURIComponent(service)}`;
  
  const handleClick = () => {
    trackCTAClick({ label, location, service });
  };
  
  return (
    <Link href={href} className={className} onClick={handleClick}>
      {label}
    </Link>
  );
}
