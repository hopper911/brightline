import Link from "next/link";
import { PageShell } from "@/components/studio/PageShell";
import { LeadsList } from "./LeadsList";

export const metadata = {
  title: "Leads | CRM | Bright Line Studio OS",
  description: "Lead pipeline and intake.",
};

export default function LeadsPage() {
  return (
    <PageShell title="Leads" subtitle="Lead pipeline and intake.">
      <div className="space-y-6">
        <Link
          href="/studio/crm/leads/new"
          className="inline-block rounded-studio-base border border-accent-border bg-accent/10 px-4 py-2 text-sm font-medium text-white/95 transition-colors hover:bg-accent/15"
        >
          New lead
        </Link>
        <LeadsList />
      </div>
    </PageShell>
  );
}
