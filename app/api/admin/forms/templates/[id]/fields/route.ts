import { FormFieldType, FormSubmissionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fieldSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1).max(500),
  fieldType: z.nativeEnum(FormFieldType),
  placeholder: z.string().max(500).nullable().optional(),
  required: z.boolean().optional(),
  options: z.array(z.string()).nullable().optional(),
  sortOrder: z.number().int().optional(),
  mapsToProjectField: z.string().max(120).nullable().optional(),
});

const bodySchema = z.object({
  fields: z.array(fieldSchema),
});

/** Replace all fields for a form template. */
export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id: templateId } = await context.params;
  const tpl = await prisma.formTemplate.findUnique({ where: { id: templateId } });
  if (!tpl) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });

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

  const submitted = await prisma.formSubmission.count({
    where: { formTemplateId: templateId, status: FormSubmissionStatus.SUBMITTED },
  });
  if (submitted > 0) {
    return NextResponse.json(
      { ok: false, error: "Cannot replace fields after submissions exist; duplicate the template instead." },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.formField.deleteMany({ where: { formTemplateId: templateId } });
    let order = 0;
    for (const f of parsed.data.fields) {
      await tx.formField.create({
        data: {
          formTemplateId: templateId,
          label: f.label,
          fieldType: f.fieldType,
          placeholder: f.placeholder ?? undefined,
          required: f.required ?? false,
          options: f.options ?? undefined,
          sortOrder: f.sortOrder ?? order,
          mapsToProjectField: f.mapsToProjectField ?? undefined,
        },
      });
      order += 1;
    }
  });

  const fields = await prisma.formField.findMany({
    where: { formTemplateId: templateId },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ ok: true, fields });
}
