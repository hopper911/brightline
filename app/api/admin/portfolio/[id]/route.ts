import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await authorizeAdminRequest(req);
    if (!isAdmin) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }
    const { id } = await context.params;

    const existing = await prisma.portfolioProject.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Project not found." },
        { status: 404 }
      );
    }

    await prisma.portfolioProject.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("PORTFOLIO_DELETE_ERROR", err);
    const message =
      err instanceof Error ? err.message : "Failed to delete project.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
