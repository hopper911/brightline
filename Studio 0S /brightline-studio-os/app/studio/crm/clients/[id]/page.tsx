import { notFound } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/studio/PageShell";
import { ClientDetail } from "./ClientDetail";

async function getClient(id: string) {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/clients/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  return (
    <PageShell title={client.name} subtitle="Client">
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/studio/crm/clients/${id}/edit`}
            className="rounded-studio-base border border-accent-border bg-accent/10 px-4 py-2 text-sm font-medium text-white/95 transition-colors hover:bg-accent/15"
          >
            Edit
          </Link>
          <Link
            href={`/studio/projects/new?clientId=${id}`}
            className="rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/[0.05]"
          >
            New project
          </Link>
        </div>
        <ClientDetail client={client} />
      </div>
    </PageShell>
  );
}
