import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;

  const client = await prisma.studioClient.findUnique({
    where: { id },
    include: {
      projects: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          totalPrice: true,
          amountPaid: true,
          balanceRemaining: true,
          paymentStatus: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!client) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  const leads = await prisma.studioLead.findMany({
    where: { convertedClientId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      createdAt: true,
      convertedProjectId: true,
    },
  });

  return NextResponse.json({ ok: true, client, leads });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const existing = await prisma.studioClient.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  const data: Prisma.StudioClientUpdateInput = {};

  if (typeof body.companyName === "string" && body.companyName.trim()) {
    data.companyName = body.companyName.trim();
  }
  const optStr = (k: string) => {
    if (body[k] === undefined) return;
    if (body[k] === null) {
      (data as Record<string, unknown>)[k] = null;
      return;
    }
    if (typeof body[k] === "string") {
      const v = (body[k] as string).trim();
      (data as Record<string, unknown>)[k] = v || null;
    }
  };

  optStr("primaryContactName");
  optStr("email");
  optStr("phone");
  optStr("website");
  optStr("industry");
  optStr("addressLine1");
  optStr("addressLine2");
  optStr("city");
  optStr("state");
  optStr("postalCode");
  optStr("country");
  optStr("notes");

  if (body.followUpStatus !== undefined) {
    const status = typeof body.followUpStatus === "string" ? body.followUpStatus.trim() : "";
    if (status === "NONE" || status === "NEEDED" || status === "SCHEDULED" || status === "DONE") {
      data.followUpStatus = status;
    }
  }
  if (body.followUpAt !== undefined) {
    data.followUpAt =
      typeof body.followUpAt === "string" && body.followUpAt.trim()
        ? new Date(body.followUpAt)
        : null;
  }

  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive;
  }

  const client = await prisma.studioClient.update({
    where: { id },
    data,
  });

  return NextResponse.json({ ok: true, client });
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;

  const projectCount = await prisma.studioProject.count({ where: { clientId: id } });
  if (projectCount > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Client has linked projects. Deactivate instead or reassign projects.",
      },
      { status: 409 }
    );
  }

  await prisma.studioClient.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
