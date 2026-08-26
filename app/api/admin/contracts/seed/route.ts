import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { logDocumentAudit } from "@/lib/contracts/audit";
import { STARTER_DOCUMENT_TEMPLATES } from "@/lib/contracts/seed-templates";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let created = 0;
  let skipped = 0;
  for (const t of STARTER_DOCUMENT_TEMPLATES) {
    const exists = await prisma.documentTemplate.findFirst({
      where: { title: t.title },
      select: { id: true },
    });
    if (exists) {
      skipped += 1;
      continue;
    }
    await prisma.documentTemplate.create({
      data: {
        title: t.title,
        type: t.type,
        description: t.description,
        contentHtml: t.contentHtml,
        variables: t.variables,
        isActive: true,
        createdByLabel: "seed",
      },
    });
    created += 1;
  }

  await logDocumentAudit({
    actorType: "admin",
    action: "document.templates_seeded",
    metadata: { created, skipped },
    req,
  });

  return NextResponse.json({ ok: true, created, skipped });
}
