import Link from "next/link";

export default function PrimaryCTA({
  service = "general",
  className = "btn btn-primary",
  label = "Request a quote",
}: {
  service?: string;
  className?: string;
  label?: string;
}) {
  const href = `/contact?service=${encodeURIComponent(service)}`;
  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}
