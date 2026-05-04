import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VersionInput = {
  fieldKey?: unknown;
  oldValue?: unknown;
  newValue?: unknown;
  promptMode?: unknown;
  tonePreset?: unknown;
};

function cleanString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeVersion(input: VersionInput) {
  const fieldKey = cleanString(input.fieldKey);
  const promptMode = cleanString(input.promptMode);
  if (!fieldKey || !promptMode) return null;
  return {
    fieldKey,
    oldValue: cleanString(input.oldValue),
    newValue: cleanString(input.newValue),
    promptMode,
    tonePreset: cleanString(input.tonePreset),
  };
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id: projectId } = await context.params;
  const url = new URL(req.url);
  const fieldKey = cleanString(url.searchParams.get("fieldKey"));
  const versions = await prisma.projectCopyVersion.findMany({
    where: { projectId, ...(fieldKey ? { fieldKey } : {}) },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ ok: true, versions });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id: projectId } = await context.params;
  const project = await prisma.workProject.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) {
    return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const rawVersions =
    body && typeof body === "object" && !Array.isArray(body) && Array.isArray((body as { versions?: unknown }).versions)
      ? ((body as { versions: VersionInput[] }).versions)
      : [body as VersionInput];

  const versions = rawVersions.map(normalizeVersion).filter((item): item is NonNullable<typeof item> => Boolean(item));
  if (!versions.length) {
    return NextResponse.json({ ok: false, error: "No valid versions provided." }, { status: 400 });
  }

  await prisma.projectCopyVersion.createMany({
    data: versions.map((version) => ({ ...version, projectId })),
  });

  return NextResponse.json({ ok: true });
}

