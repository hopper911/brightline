import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Project contracts · Admin",
  robots: { index: false, follow: false },
};

export default async function ProjectContractsPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminAccess())) redirect("/admin/login");
  const { id } = await params;
  const project = await prisma.studioProject.findUnique({
    where: { id },
    include: { studioClient: true },
  });
  if (!project) redirect("/admin/projects");

  const docs = await prisma.generatedDocument.findMany({
    where: { studioProjectId: id },
    orderBy: { createdAt: "desc" },
    include: { template: { select: { title: true, type: true } } },
  });

  const q = new URLSearchParams();
  if (project.clientId) q.set("clientId", project.clientId);
  q.set("projectId", project.id);
  const genHref = `/admin/contracts/generated/new?${q.toString()}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 text-white">
      <p className="text-xs uppercase tracking-[0.35em] text-white/50">
        <Link href={`/admin/projects/${project.id}`} className="hover:text-white">
          {project.title}
        </Link>{" "}
        / Contracts
      </p>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl">Contracts &amp; forms</h1>
        <div className="flex flex-wrap gap-2">
          <Link href={genHref} className="btn btn-primary">
            Generate document
          </Link>
          <Link href="/admin/contracts/forms/assign" className="btn border border-white/20 bg-white/5">
            Assign form
          </Link>
        </div>
      </div>
      <p className="mt-2 text-sm text-white/60">
        Client: {project.studioClient?.companyName ?? project.client}
        {project.clientId && (
          <>
            {" "}
            <Link href={`/admin/clients/${project.clientId}`} className="text-amber-200/90 hover:text-amber-100">
              Open client
            </Link>
          </>
        )}
      </p>

      <div className="mt-10 overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-white/50">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                <td className="px-4 py-3 font-medium">{d.title}</td>
                <td className="px-4 py-3 text-white/70">{d.template.type}</td>
                <td className="px-4 py-3">{d.status}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/contracts/generated/${d.id}`} className="text-amber-200/90 hover:text-amber-100">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {docs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-white/50">
                  No documents for this project yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
