import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { hashAccountantPassword } from "@/lib/accountant/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
});

/** Create or update accountant login (admin / owner only). */
export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "email and password (min 12 chars) required." },
      { status: 400 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const passwordHash = await hashAccountantPassword(parsed.data.password);

  const existing = await prisma.accountantAccess.findUnique({ where: { email }, include: { permissions: true } });
  const row = existing
    ? await prisma.$transaction(async (tx) => {
        await tx.accountantAccess.update({
          where: { email },
          data: { passwordHash, isActive: true },
        });
        if (!existing.permissions) {
          await tx.accountantPermission.create({
            data: { accountantAccessId: existing.id },
          });
        }
        return tx.accountantAccess.findUniqueOrThrow({
          where: { email },
          select: { id: true, email: true, isActive: true },
        });
      })
    : await prisma.accountantAccess.create({
        data: {
          email,
          passwordHash,
          isActive: true,
          permissions: { create: {} },
        },
        select: { id: true, email: true, isActive: true },
      });

  return NextResponse.json({ ok: true, accountant: row });
}
