import { PageShell } from "@/components/studio/PageShell";
import { ProductionRoom } from "./ProductionRoom";

export default function ProductionPage() {
  return (
    <PageShell
      title="Production Office"
      subtitle="Scheduling and logistics. Create projects, generate briefs and checklists, track timeline."
    >
      <ProductionRoom />
    </PageShell>
  );
}
