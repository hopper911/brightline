import { PageShell } from "@/components/studio/PageShell";
import { EditingRoom } from "./EditingRoom";

export default function EditingPage() {
  return (
    <PageShell
      title="Editing Bay"
      subtitle="Image analysis and review. Scan folders for blur, low resolution, and duplicates."
    >
      <EditingRoom />
    </PageShell>
  );
}
