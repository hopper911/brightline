import { notFound } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/studio/PageShell";
import { LeadDetail } from "./LeadDetail";
import { ConvertButton } from "./ConvertButton";

export const metadata = {
  title: "Lead | CRM | Bright Line Studio OS",
  description: "Lead details.",
};

async function getLead(id: string) {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/leads/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  return (
    <PageShell title={lead.name} subtitle={`Lead · ${lead.status}`}>
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/studio/crm/leads/${id}/edit`}
            className="rounded-studio-base border border-accent-border bg-accent/10 px-4 py-2 text-sm font-medium text-white/95 transition-colors hover:bg-accent/15"
          >
            Edit
          </Link>
          {!lead.clientId && <ConvertButton leadId={id} />}
        </div>
        <LeadDetail lead={lead} />
      </div>
    </PageShell>
  );
}
