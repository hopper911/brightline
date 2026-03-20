import { PageShell } from "@/components/studio/PageShell";
import { MarketingRoom } from "./MarketingRoom";
import { getProjects } from "./actions";

export default async function MarketingPage() {
  const projects = await getProjects();
  return (
    <PageShell
      title="Publishing Office"
      subtitle="Content and campaigns. Social, portfolio updates, and case studies."
    >
      <MarketingRoom projects={projects} />
    </PageShell>
  );
}
