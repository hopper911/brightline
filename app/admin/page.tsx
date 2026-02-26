import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import AdminLogoutButton from "./logout-button";

export const metadata = {
  title: "Admin · Bright Line Photography",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) {
    redirect("/admin/login");
  }

  let stats: {
    portfolioProjects: number;
    workProjects: number;
    clientGalleries: number;
    clientAccessCodes: number;
    leads: number;
  } | null = null;

  try {
    const [
      portfolioProjects,
      workProjects,
      clientGalleries,
      clientAccessCodes,
      leads,
    ] = await Promise.all([
      prisma.portfolioProject.count(),
      prisma.workProject.count(),
      prisma.gallery.count(),
      prisma.galleryAccessToken.count(),
      prisma.lead.count(),
    ]);
    stats = { portfolioProjects, workProjects, clientGalleries, clientAccessCodes, leads };
  } catch {
    stats = null;
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-6xl flex-col px-4 py-16">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.35em] text-black/50">
          Admin Dashboard
        </p>
        <h1 className="font-display text-4xl text-black">Admin</h1>
        <p className="text-base text-black/70">
          Manage portfolio uploads and settings.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white/70 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-black/50">
            Portfolio projects
          </p>
          <p className="mt-2 text-3xl text-black">
            {stats ? stats.portfolioProjects : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/70 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-black/50">
            Work projects
          </p>
          <p className="mt-2 text-3xl text-black">
            {stats ? stats.workProjects : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/70 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-black/50">
            Client galleries
          </p>
          <p className="mt-2 text-3xl text-black">
            {stats ? stats.clientGalleries : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/70 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-black/50">
            Access codes
          </p>
          <p className="mt-2 text-3xl text-black">
            {stats ? stats.clientAccessCodes : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/70 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-black/50">
            Leads
          </p>
          <p className="mt-2 text-3xl text-black">
            {stats ? stats.leads : "—"}
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link href="/admin/portfolio" className="btn btn-primary">
          Portfolio
        </Link>
        <Link href="/admin/work" className="btn btn-primary">
          Work
        </Link>
        <Link href="/admin/clients" className="btn btn-ghost">
          Clients
        </Link>
      </div>

      <div className="mt-8">
        <AdminLogoutButton />
      </div>
    </div>
  );
}
