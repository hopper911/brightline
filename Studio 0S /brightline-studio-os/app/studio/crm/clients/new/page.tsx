import { PageShell } from "@/components/studio/PageShell";
import { ClientForm } from "../ClientForm";

export const metadata = {
  title: "New client | CRM | Bright Line Studio OS",
  description: "Add a new client.",
};

export default function NewClientPage() {
  return (
    <PageShell title="New client" subtitle="Add a new client to your directory.">
      <ClientForm />
    </PageShell>
  );
}
