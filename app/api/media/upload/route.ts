import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireProjectsApiAuth } from "@/lib/api/automation-auth";
import { getPublicR2Url } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 12 * 1024 * 1024;

function safeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "image";
  return base.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120) || "image.jpg";
}

export async function POST(req: Request) {
  const auth = await requireProjectsApiAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  // Lazy imports: keep native deps + AWS SDK out of module init during Next build.
  const [{ default: sharp }, { putObjectBuffer }, { attachMediaToStudioProject }] =
    await Promise.all([
      import("sharp"),
      import("@/lib/storage-r2"),
      import("@/lib/studio/studio-project-cms"),
    ]);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Expected multipart form data." }, { status: 400 });
  }

  const projectId = form.get("projectId")?.toString().trim() || "";
  const studioProjectId = form.get("studioProjectId")?.toString().trim() || "";
  if (projectId && studioProjectId) {
    return NextResponse.json(
      { ok: false, error: "Provide only one of projectId (WorkProject) or studioProjectId (Studio CMS)." },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ ok: false, error: "Missing file field." }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "File too large." }, { status: 400 });
  }

  const setAsHero = form.get("setAsHero") === "true" || form.get("setAsHero") === "1";
  const altOverride = form.get("alt")?.toString().trim() || "";
  const projectTitleForAlt = form.get("projectTitle")?.toString().trim() || "";

  type WorkProjectWithLatestMedia = Prisma.WorkProjectGetPayload<{
    include: { media: { orderBy: { sortOrder: "desc" }; take: 1 } };
  }>;
  let workRow: WorkProjectWithLatestMedia | null = null;
  if (projectId) {
    workRow = await prisma.workProject.findUnique({
      where: { id: projectId },
      include: { media: { orderBy: { sortOrder: "desc" }, take: 1 } },
    });
    if (!workRow) {
      return NextResponse.json({ ok: false, error: "projectId not found." }, { status: 404 });
    }
  }

  let studioRow: Awaited<ReturnType<typeof prisma.studioProject.findUnique>> = null;
  if (studioProjectId) {
    studioRow = await prisma.studioProject.findUnique({ where: { id: studioProjectId } });
    if (!studioRow) {
      return NextResponse.json({ ok: false, error: "studioProjectId not found." }, { status: 404 });
    }
  }

  const originalName = file instanceof File ? file.name : "upload";
  const safe = safeFilename(originalName);
  const idPart = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const keyFull = `studio/${idPart}/${safe}`;

  const contentType = file.type || "image/jpeg";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ ok: false, error: "Only image uploads are supported." }, { status: 400 });
  }

  const image = sharp(buf, { failOn: "none" });
  const meta = await image.metadata();
  const width = meta.width ?? undefined;
  const height = meta.height ?? undefined;

  await putObjectBuffer({
    key: keyFull,
    body: buf,
    contentType,
    access: "public-read",
  });

  const thumbBuf = await sharp(buf)
    .rotate()
    .resize({ width: 800, withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const thumbKey = `studio/${idPart}/thumb-${safe.replace(/\.[^.]+$/, "")}.jpg`;
  await putObjectBuffer({
    key: thumbKey,
    body: thumbBuf,
    contentType: "image/jpeg",
    access: "public-read",
  });

  let alt: string | null = altOverride || null;
  if (!alt && studioRow) {
    const title = projectTitleForAlt || studioRow.title;
    const gallery = Array.isArray(studioRow.gallery) ? studioRow.gallery : [];
    const n = String(gallery.length + 1).padStart(2, "0");
    alt = `${title} – Image ${n}`;
  } else if (!alt && workRow) {
    const title = projectTitleForAlt || workRow.title;
    if (title) {
      const existingCount = await prisma.projectMedia.count({ where: { projectId } });
      const n = String(existingCount + 1).padStart(2, "0");
      alt = `${title} – Image ${n}`;
    }
  } else if (!alt && projectTitleForAlt) {
    const n = "01";
    alt = `${projectTitleForAlt} – Image ${n}`;
  }

  const media = await prisma.mediaAsset.create({
    data: {
      kind: "IMAGE",
      keyFull,
      keyThumb: thumbKey,
      alt,
      width: width ?? null,
      height: height ?? null,
    },
  });

  if (projectId && workRow) {
    const nextOrder = (workRow.media[0]?.sortOrder ?? -1) + 1;
    await prisma.projectMedia.create({
      data: { projectId, mediaId: media.id, sortOrder: nextOrder },
    });
    if (setAsHero) {
      await prisma.workProject.update({
        where: { id: projectId },
        data: { heroMediaId: media.id },
      });
    } else if (!workRow.heroMediaId) {
      await prisma.workProject.update({
        where: { id: projectId },
        data: { heroMediaId: media.id },
      });
    }
  }

  if (studioProjectId) {
    try {
      await attachMediaToStudioProject({
        studioProjectId,
        mediaId: media.id,
        keyFull,
        alt: media.alt,
        setAsHero,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to attach media to studio project.";
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
  }

  const url = getPublicR2Url(keyFull);
  const thumbUrl = getPublicR2Url(thumbKey);

  return NextResponse.json({
    ok: true,
    url,
    key: keyFull,
    width: media.width,
    height: media.height,
    mimeType: contentType,
    thumbKey,
    thumbUrl,
    alt: media.alt,
    mediaId: media.id,
    metadata: {
      bytes: buf.length,
      format: meta.format ?? null,
      space: meta.space ?? null,
      hasAlpha: meta.hasAlpha ?? false,
      orientation: meta.orientation ?? null,
    },
  });
}
