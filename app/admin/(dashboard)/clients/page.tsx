import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Clients · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

function parseActive(
  v: string | undefined
): boolean | undefined {
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; active?: string }>;
}) {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const active = parseActive(sp.active);

  const where: Prisma.StudioClientWhereInput = {};
  if (active !== undefined) where.isActive = active;
  if (q) {
    where.OR = [
      { companyName: { contains: q, mode: "insensitive" } },
      { primaryContactName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const clients = await prisma.studioClient.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { projects: true } } },
  });

  const baseQs = new URLSearchParams();
  if (q) baseQs.set("q", q);
  const filterLink = (a: string | undefined) => {
    const p = new URLSearchParams(baseQs);
    if (a === "true") p.set("active", "true");
    else if (a === "false") p.set("active", "false");
    else p.delete("active");
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">
            Studio OS
          </p>
          <h1 className="font-display text-4xl text-white">Clients</h1>
          <p className="mt-2 text-sm text-white/70">
            Canonical client records for projects and billing context.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/clients/new"
            className="btn btn-primary"
          >
            New client
          </Link>
          <Link
            href="/admin/client-access"
            className="btn btn-ghost text-white/80"
          >
            Gallery access codes
          </Link>
        </div>
      </div>

      <form
        method="get"
        className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="Search company, contact, email"
          className="min-w-[220px] flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-white/40"
        />
        {typeof sp.active === "string" ? (
          <input type="hidden" name="active" value={sp.active} />
        ) : null}
        <button type="submit" className="btn btn-ghost">
          Search
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <span className="text-white/50">Status:</span>
        <Link
          href={`/admin/clients${filterLink(undefined)}`}
          className={
            active === undefined
              ? "text-white underline"
              : "text-white/60 hover:text-white"
          }
        >
          All
        </Link>
        <Link
          href={`/admin/clients${filterLink("true")}`}
          className={
            active === true
              ? "text-white underline"
              : "text-white/60 hover:text-white"
          }
        >
          Active
        </Link>
        <Link
          href={`/admin/clients${filterLink("false")}`}
          className={
            active === false
              ? "text-white underline"
              : "text-white/60 hover:text-white"
          }
        >
          Inactive
        </Link>
      </div>

      {clients.length === 0 ? (
        <p className="mt-10 text-sm text-white/60">
          No clients match.{" "}
          <Link href="/admin/clients/new" className="underline">
            Create one
          </Link>
          .
        </p>
      ) : (
        <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
          <div className="grid grid-cols-12 gap-2 border-b border-white/10 bg-white/5 px-4 py-3 text-[0.65rem] uppercase tracking-[0.25em] text-white/50">
            <div className="col-span-4">Company</div>
            <div className="col-span-3">Contact</div>
            <div className="col-span-2">Email</div>
            <div className="col-span-1 text-center">Projects</div>
            <div className="col-span-2 text-right">Updated</div>
          </div>
          <ul className="divide-y divide-white/10">
            {clients.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/clients/${c.id}`}
                  className="grid grid-cols-12 gap-2 px-4 py-3 text-sm transition-colors hover:bg-white/5"
                >
                  <div className="col-span-4 truncate font-medium text-white/90">
                    {c.companyName}
                    {!c.isActive ? (
                      <span className="ml-2 text-xs text-white/40">(inactive)</span>
                    ) : null}
                  </div>
                  <div className="col-span-3 truncate text-white/70">
                    {c.primaryContactName ?? "—"}
                  </div>
                  <div className="col-span-2 truncate text-white/60">
                    {c.email ?? "—"}
                  </div>
                  <div className="col-span-1 text-center text-white/70">
                    {c._count.projects}
                  </div>
                  <div className="col-span-2 text-right text-white/50">
                    {c.updatedAt.toLocaleDateString()}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
