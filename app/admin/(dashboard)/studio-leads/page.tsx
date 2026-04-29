import Link from "next/link";
import { redirect } from "next/navigation";
import type { LeadStatus, Prisma } from "@prisma/client";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Studio Leads · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

function parseConverted(v: string | undefined): boolean | undefined {
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

export default async function AdminStudioLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; converted?: string }>;
}) {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = (sp.status ?? "").trim();
  const converted = parseConverted(sp.converted);

  const where: Prisma.StudioLeadWhereInput = {};
  if (status) where.status = status as LeadStatus;
  if (converted !== undefined) {
    where.convertedProjectId = converted ? { not: null } : null;
  }
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { company: { contains: q, mode: "insensitive" } },
    ];
  }

  const leads = await prisma.studioLead.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    take: 200,
    include: {
      convertedClient: { select: { id: true, companyName: true } },
      convertedProject: { select: { id: true, title: true, slug: true } },
    },
  });

  const baseQs = new URLSearchParams();
  if (q) baseQs.set("q", q);
  if (status) baseQs.set("status", status);

  const filterLink = (c: string | undefined) => {
    const p = new URLSearchParams(baseQs);
    if (c === "true") p.set("converted", "true");
    else if (c === "false") p.set("converted", "false");
    else p.delete("converted");
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
          <h1 className="font-display text-4xl text-white">Studio leads</h1>
          <p className="mt-2 text-sm text-white/70">
            Normalized lead records (conversion-ready).
          </p>
          <p className="mt-1 text-xs text-white/45">
            Primary pipeline — legacy webform rows remain under Leads (legacy).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/leads" className="btn btn-ghost">
            Inbound leads (legacy)
          </Link>
          <Link href="/admin/studio-leads/new" className="btn btn-primary">
            New lead
          </Link>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <form className="flex flex-1 flex-wrap items-center gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name, email, company…"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white sm:w-80"
          />
          <select
            name="status"
            defaultValue={status}
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white"
          >
            <option value="">Any status</option>
            <option value="NEW">NEW</option>
            <option value="REVIEWED">REVIEWED</option>
            <option value="QUALIFIED">QUALIFIED</option>
            <option value="FOLLOW_UP_NEEDED">FOLLOW_UP_NEEDED</option>
            <option value="PROPOSAL_PENDING">PROPOSAL_PENDING</option>
            <option value="WON">WON</option>
            <option value="LOST">LOST</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
          <button type="submit" className="btn btn-ghost">
            Filter
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          <Link href={filterLink(undefined)} className="btn btn-ghost">
            All
          </Link>
          <Link href={filterLink("false")} className="btn btn-ghost">
            Unconverted
          </Link>
          <Link href={filterLink("true")} className="btn btn-ghost">
            Converted
          </Link>
        </div>
      </div>

      <div className="mt-10 space-y-3">
        {leads.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center text-sm text-white/60">
            No Studio leads found.
          </div>
        ) : (
          leads.map((lead) => (
            <Link
              key={lead.id}
              href={`/admin/studio-leads/${lead.id}`}
              className="block rounded-2xl border border-white/10 bg-white/5 px-6 py-4 hover:bg-white/10"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                    {lead.name}
                  </p>
                  <p className="text-sm text-white/90">{lead.email}</p>
                  {lead.company ? (
                    <p className="text-xs text-white/50">{lead.company}</p>
                  ) : null}
                </div>
                <div className="text-right text-xs text-white/40">
                  <p>{new Date(lead.createdAt).toLocaleString()}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/50">
                    {lead.status}
                    {lead.convertedProjectId ? " · converted" : ""}
                  </p>
                </div>
              </div>
              {lead.message ? (
                <p className="mt-3 line-clamp-2 text-sm text-white/70">
                  {lead.message}
                </p>
              ) : null}
              {lead.convertedClientId || lead.convertedProjectId ? (
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/50">
                  {lead.convertedClient ? (
                    <span>Client: {lead.convertedClient.companyName}</span>
                  ) : null}
                  {lead.convertedProject ? (
                    <span>Project: {lead.convertedProject.title}</span>
                  ) : null}
                </div>
              ) : null}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

