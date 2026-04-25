import StudioProjectForm from "@/components/admin/StudioProjectForm";

export default function AdminProjectsNewPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="section-title">New project page</h1>
      <p className="section-subtitle">
        Studio CMS — add copy, media, and SEO. Save a draft to upload images, then publish when ready.
      </p>
      <div className="mt-10">
        <StudioProjectForm />
      </div>
    </div>
  );
}
