import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadSubmission(token: string) {
  return prisma.formSubmission.findFirst({
    where: { clientToken: token },
    include: {
      formTemplate: {
        include: { fields: { orderBy: { sortOrder: "asc" } } },
      },
      values: true,
    },
  });
}

export async function GET(_req: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const sub = await loadSubmission(token);
  if (!sub) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  return NextResponse.json({
    ok: true,
    status: sub.status,
    template: {
      title: sub.formTemplate.title,
      description: sub.formTemplate.description,
      type: sub.formTemplate.type,
    },
    fields: sub.formTemplate.fields.map((f) => ({
      id: f.id,
      label: f.label,
      fieldType: f.fieldType,
      placeholder: f.placeholder,
      required: f.required,
      options: f.options,
      sortOrder: f.sortOrder,
    })),
    existingValues: sub.values.reduce<Record<string, string>>((acc, v) => {
      acc[v.fieldId] = v.value;
      return acc;
    }, {}),
  });
}
