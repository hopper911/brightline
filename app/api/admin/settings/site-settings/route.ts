import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const settings = await prisma.siteSetting.findMany({
    orderBy: { key: "asc" },
  });

  return NextResponse.json({ ok: true, settings });
}

export async function PATCH(req: Request) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const updates = Array.isArray(body)
    ? (body as Array<{ key?: unknown; value?: unknown }>)
    : (body as any)?.updates && Array.isArray((body as any).updates)
      ? ((body as any).updates as Array<{ key?: unknown; value?: unknown }>)
      : [];

  if (updates.length === 0) {
    return NextResponse.json({ ok: false, error: "updates[] required." }, { status: 400 });
  }

  const normalized = updates
    .map((u) => {
      const key = typeof u.key === "string" ? u.key.trim() : "";
      if (!key) return null;
      const value =
        u.value === null || u.value === undefined
          ? null
          : typeof u.value === "string"
            ? u.value
            : String(u.value);
      return { key, value };
    })
    .filter(Boolean) as Array<{ key: string; value: string | null }>;

  if (normalized.length === 0) {
    return NextResponse.json({ ok: false, error: "No valid updates." }, { status: 400 });
  }

  await prisma.$transaction(
    normalized.map((u) =>
      prisma.siteSetting.upsert({
        where: { key: u.key },
        update: { value: u.value },
        create: { key: u.key, value: u.value },
      })
    )
  );

  const settings = await prisma.siteSetting.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json({ ok: true, settings });
}

