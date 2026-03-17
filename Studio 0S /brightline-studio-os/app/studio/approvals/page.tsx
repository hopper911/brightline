import { PageShell } from "@/components/studio/PageShell";
import { ApprovalsList } from "./ApprovalsList";

export default function ApprovalsPage() {
  return (
    <PageShell
      title="Approvals"
      subtitle="Review and sign-off on pending actions."
    >
      <ApprovalsList />
    </PageShell>
  );
}
