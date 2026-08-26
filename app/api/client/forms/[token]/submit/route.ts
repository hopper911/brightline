import { FormSubmissionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { logDocumentAudit } from "@/lib/contracts/audit";
import { parseFieldValue } from "@/lib/forms/validate";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.record(z.string(), z.any());

export async function POST(req: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const sub = await prisma.formSubmission.findFirst({
    where: { clientToken: token },
    include: { formTemplate: { include: { fields: true } } },
  });
  if (!sub) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  if (sub.status === FormSubmissionStatus.SUBMITTED) {
    return NextResponse.json({ ok: false, error: "Already submitted." }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid body." }, { status: 400 });
  }

  const payload = parsed.data as Record<string, unknown>;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.formSubmissionValue.deleteMany({ where: { submissionId: sub.id } });
      for (const field of sub.formTemplate.fields) {
        const val = parseFieldValue(field.fieldType, payload[field.id], field.options, field.required);
        await tx.formSubmissionValue.create({
          data: { submissionId: sub.id, fieldId: field.id, value: val },
        });
      }
      await tx.formSubmission.update({
        where: { id: sub.id },
        data: { status: FormSubmissionStatus.SUBMITTED, submittedAt: new Date() },
      });
    });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ ok: false, error: "Validation failed.", issues: e.flatten() }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : "Validation error";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  await logDocumentAudit({
    formSubmissionId: sub.id,
    actorType: "client",
    action: "form.submitted",
    req,
  });

  return NextResponse.json({ ok: true });
}
