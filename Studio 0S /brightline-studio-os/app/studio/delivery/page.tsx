import { PageShell } from "@/components/studio/PageShell";
import { DeliveryRoom } from "./DeliveryRoom";

export const metadata = {
  title: "Delivery Suite | Bright Line Studio OS",
  description: "Prepare deliveries and client handoffs. Draft-focused, no automation.",
};

export default function DeliveryPage() {
  return (
    <PageShell
      title="Delivery Suite"
      subtitle="Prepare client handoffs. Checklists, email drafts, and delivery notes. No actual sending."
    >
      <DeliveryRoom />
    </PageShell>
  );
}
