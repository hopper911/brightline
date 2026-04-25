import Link from "next/link";
import { CLIENTS } from "@/lib/clients";

export default function ClientLogos() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
      {CLIENTS.map((client) =>
        client.url ? (
          <Link
            key={client.name}
            href={client.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs uppercase tracking-[0.28em] text-black/50 hover:text-black/80 transition-colors"
            aria-label={client.name}
          >
            {client.name}
          </Link>
        ) : (
          <span
            key={client.name}
            className="text-xs uppercase tracking-[0.28em] text-black/50"
          >
            {client.name}
          </span>
        )
      )}
    </div>
  );
}
