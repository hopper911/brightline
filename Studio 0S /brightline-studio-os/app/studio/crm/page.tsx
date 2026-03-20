import Link from "next/link";
import { PageShell } from "@/components/studio/PageShell";
import { CRMList } from "./CRMList";

export const metadata = {
  title: "CRM | Bright Line Studio OS",
  description: "Leads and clients. Manage intake and relationships.",
};

export default function CRMPage() {
  return (
    <PageShell title="CRM" subtitle="Leads and clients. Manage intake and relationships.">
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/studio/crm/leads/new"
            className="rounded-studio-base border border-accent-border bg-accent/10 px-4 py-2 text-sm font-medium text-white/95 transition-colors hover:bg-accent/15"
          >
            New lead
          </Link>
          <Link
            href="/studio/crm/clients/new"
            className="rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/[0.05]"
          >
            New client
          </Link>
          <Link
            href="/studio/crm/inquiry"
            className="rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/[0.05]"
          >
            Analyze inquiry
          </Link>
        </div>
        <CRMList />
      </div>
    </PageShell>
  );
}
