import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { createStudioEmailDraft } from "@/lib/studio/email";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const drafts = await prisma.studioEmailDraft.findMany({
    orderBy: { updatedAt: "desc" },
    take: 25,
    include: {
      account: { select: { emailAddress: true, displayName: true } },
    },
  });

  return NextResponse.json({ ok: true, drafts });
}

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: {
    to?: unknown;
    subject?: unknown;
    text?: unknown;
    html?: unknown;
    entityType?: unknown;
    entityId?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const draft = await createStudioEmailDraft({
      to: typeof body.to === "string" ? body.to : "",
      subject: typeof body.subject === "string" ? body.subject : "",
      text: typeof body.text === "string" ? body.text : "",
      html: typeof body.html === "string" ? body.html : undefined,
      entityType: typeof body.entityType === "string" ? body.entityType : undefined,
      entityId: typeof body.entityId === "string" ? body.entityId : undefined,
    });

    return NextResponse.json({ ok: true, draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create draft.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
