import { PageShell } from "@/components/studio/PageShell";
import { ReceptionRoom } from "../ReceptionRoom";

export const metadata = {
  title: "Analyze inquiry | CRM | Bright Line Studio OS",
  description: "Analyze lead inquiries with AI.",
};

export default function InquiryPage() {
  return (
    <PageShell
      title="Analyze inquiry"
      subtitle="Paste or type a lead inquiry for AI analysis."
    >
      <ReceptionRoom />
    </PageShell>
  );
}
