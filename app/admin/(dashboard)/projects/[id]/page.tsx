import { redirect } from "next/navigation";

/** Canonical edit URL is `/admin/projects/[id]/edit`; this avoids broken links. */
export default async function AdminProjectIdRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/projects/${id}/edit`);
}
