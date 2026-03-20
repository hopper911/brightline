import Link from "next/link";
import { PageShell } from "@/components/studio/PageShell";
import { ClientsList } from "./ClientsList";

export const metadata = {
  title: "Clients | CRM | Bright Line Studio OS",
  description: "Client directory.",
};

export default function ClientsPage() {
  return (
    <PageShell title="Clients" subtitle="Client directory and relationships.">
      <div className="space-y-6">
        <Link
          href="/studio/crm/clients/new"
          className="inline-block rounded-studio-base border border-accent-border bg-accent/10 px-4 py-2 text-sm font-medium text-white/95 transition-colors hover:bg-accent/15"
        >
          New client
        </Link>
        <ClientsList />
      </div>
    </PageShell>
  );
}
