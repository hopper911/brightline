import { FormSubmissionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { logDocumentAudit } from "@/lib/contracts/audit";
import { generateClientToken } from "@/lib/contracts/r2-keys";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  formTemplateId: z.string().min(1),
  studioClientId: z.string().min(1),
  studioProjectId: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Validation failed.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const tpl = await prisma.formTemplate.findUnique({ where: { id: parsed.data.formTemplateId } });
  if (!tpl?.isActive) {
    return NextResponse.json({ ok: false, error: "Form template not found." }, { status: 404 });
  }

  const client = await prisma.studioClient.findUnique({ where: { id: parsed.data.studioClientId } });
  if (!client) return NextResponse.json({ ok: false, error: "Client not found." }, { status: 404 });

  if (parsed.data.studioProjectId) {
    const p = await prisma.studioProject.findUnique({ where: { id: parsed.data.studioProjectId } });
    if (!p) return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
    if (p.clientId && p.clientId !== client.id) {
      return NextResponse.json({ ok: false, error: "Project client mismatch." }, { status: 400 });
    }
  }

  const submission = await prisma.formSubmission.create({
    data: {
      formTemplateId: tpl.id,
      studioClientId: client.id,
      studioProjectId: parsed.data.studioProjectId ?? null,
      status: FormSubmissionStatus.DRAFT,
      clientToken: generateClientToken(),
    },
  });

  await logDocumentAudit({
    formSubmissionId: submission.id,
    actorType: "admin",
    action: "form.assigned",
    metadata: { formTemplateId: tpl.id },
    req,
  });

  return NextResponse.json({ ok: true, submission });
}
