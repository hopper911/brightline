import { PageShell } from "@/components/studio/PageShell";
import { ArchiveRoom } from "./ArchiveRoom";

export const metadata = {
  title: "Archive Vault | Bright Line Studio OS",
  description: "Search past projects, drafts, and operational history. Read-only.",
};

export default function ArchivePage() {
  return (
    <PageShell
      title="Archive Vault"
      subtitle="Search past projects and operational history. Read-only memory layer."
      maxWidth="xl"
    >
      <ArchiveRoom />
    </PageShell>
  );
}
