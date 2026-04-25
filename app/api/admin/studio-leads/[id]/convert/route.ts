import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { slugify } from "@/lib/slugify";
import { ensureUniqueStudioSlug } from "@/lib/studio/studio-project-cms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;

  const lead = await prisma.studioLead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  if (lead.convertedClientId && lead.convertedProjectId) {
    return NextResponse.json({
      ok: true,
      convertedClientId: lead.convertedClientId,
      convertedProjectId: lead.convertedProjectId,
    });
  }

  const companyName =
    lead.company?.trim() || `${lead.name.trim() || "Client"} (Lead)`;

  const projectTitle = `${companyName} — Studio Project`;
  const baseSlug = slugify(projectTitle) || "project";
  const slug = await ensureUniqueStudioSlug(baseSlug);

  const opening = "Draft created from a converted lead.";
  const contextText =
    lead.message?.trim() ||
    "Converted from Studio Lead. Add full context, approach, and highlights before publishing.";
  const approach =
    "Define shot list, schedule, and delivery requirements based on the lead’s notes.";
  const highlight =
    "This project record was created automatically from a Studio Lead conversion.";
  const closing = "Next: confirm scope and move status forward.";

  const result = await prisma.$transaction(async (tx) => {
    const client =
      (lead.convertedClientId
        ? await tx.studioClient.findUnique({ where: { id: lead.convertedClientId } })
        : null) ??
      (await tx.studioClient.create({
        data: {
          companyName,
          primaryContactName: lead.name,
          email: lead.email,
          phone: lead.phone,
          notes: "Created by Studio Lead conversion.",
          isActive: true,
        },
      }));

    const project =
      (lead.convertedProjectId
        ? await tx.studioProject.findUnique({ where: { id: lead.convertedProjectId } })
        : null) ??
      (await tx.studioProject.create({
        data: {
          title: projectTitle,
          slug,
          clientId: client.id,
          client: client.companyName,
          category: lead.serviceType?.trim() || "Studio",
          subcategory: null,
          location: "TBD",
          year: new Date().getFullYear(),
          status: "INQUIRY",
          pillar: null,
          summary: `Converted from lead: ${lead.email}`,
          notes: "Auto-created from StudioLead conversion. Update fields before publishing.",
          isPublicReady: false,
          opening,
          context: contextText,
          approach,
          highlight,
          closing,
          featured: false,
          published: false,
          gallery: [],
        },
      }));

    const updatedLead = await tx.studioLead.update({
      where: { id: lead.id },
      data: {
        status: "QUALIFIED",
        convertedClientId: client.id,
        convertedProjectId: project.id,
      },
    });

    return {
      client,
      project,
      lead: updatedLead,
    };
  });

  return NextResponse.json({
    ok: true,
    convertedClientId: result.client.id,
    convertedProjectId: result.project.id,
  });
}

