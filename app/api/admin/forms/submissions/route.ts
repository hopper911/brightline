import { FormSubmissionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(req.url);
  const st = url.searchParams.get("status")?.trim();
  const where =
    st === FormSubmissionStatus.DRAFT || st === FormSubmissionStatus.SUBMITTED
      ? { status: st as FormSubmissionStatus }
      : undefined;

  const rows = await prisma.formSubmission.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      formTemplate: { select: { title: true, type: true } },
      studioClient: { select: { companyName: true } },
      studioProject: { select: { title: true } },
      values: { include: { field: true } },
    },
  });
  return NextResponse.json({ ok: true, submissions: rows });
}
