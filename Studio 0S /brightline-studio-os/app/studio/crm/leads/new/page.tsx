import { PageShell } from "@/components/studio/PageShell";
import { LeadForm } from "../LeadForm";

export const metadata = {
  title: "New lead | CRM | Bright Line Studio OS",
  description: "Create a new lead.",
};

export default function NewLeadPage() {
  return (
    <PageShell title="New lead" subtitle="Add a new lead to your pipeline.">
      <LeadForm />
    </PageShell>
  );
}
