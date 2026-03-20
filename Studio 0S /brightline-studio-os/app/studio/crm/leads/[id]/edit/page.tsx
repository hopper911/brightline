import { notFound } from "next/navigation";
import { PageShell } from "@/components/studio/PageShell";
import { LeadForm } from "../../LeadForm";

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

export default async function EditLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  return (
    <PageShell title="Edit lead" subtitle={lead.name}>
      <LeadForm lead={lead} />
    </PageShell>
  );
}
