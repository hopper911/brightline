import StudioProjectForm from "@/components/admin/StudioProjectForm";

export default async function AdminProjectsEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="section-title">Edit project page</h1>
      <p className="section-subtitle">Update structured content, media, SEO, and publishing.</p>
      <div className="mt-10">
        <StudioProjectForm projectId={id} />
      </div>
    </div>
  );
}
