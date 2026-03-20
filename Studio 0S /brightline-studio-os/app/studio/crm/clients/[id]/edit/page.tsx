import { notFound } from "next/navigation";
import { PageShell } from "@/components/studio/PageShell";
import { ClientForm } from "../../ClientForm";

async function getClient(id: string) {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/clients/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  return (
    <PageShell title="Edit client" subtitle={client.name}>
      <ClientForm client={client} />
    </PageShell>
  );
}
