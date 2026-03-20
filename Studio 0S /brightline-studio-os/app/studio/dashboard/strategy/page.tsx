import { PageShell } from "@/components/studio/PageShell";
import { StrategyRoom } from "./StrategyRoom";

export const metadata = {
  title: "Strategy Room | Bright Line Studio OS",
  description: "CEO dashboard. Revenue snapshot, pipeline status, priorities, risks, and opportunities.",
};

export default function StrategyPage() {
  return (
    <PageShell
      title="Strategy Room"
      subtitle="Executive intelligence. Revenue, pipeline, priorities, risks, and opportunities."
    >
      <StrategyRoom />
    </PageShell>
  );
}
