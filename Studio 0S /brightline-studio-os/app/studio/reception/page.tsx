import { PageShell } from "@/components/studio/PageShell";
import { ReceptionRoom } from "./ReceptionRoom";

export default function ReceptionPage() {
  return (
    <PageShell
      title="Reception"
      subtitle="Leads and intake. Analyze inquiries and log events."
    >
      <ReceptionRoom />
    </PageShell>
  );
}
