import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { listProjectTemplates } from "@/lib/project-templates";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function jsonObject(value: unknown, fallback: Prisma.InputJsonObject = {}) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject
    : fallback;
}

export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const templates = await listProjectTemplates();
  return NextResponse.json({ ok: true, templates });
}

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });

  const id = cleanText(body.id);
  const name = cleanText(body.name);
  const pillar = cleanText(body.pillar);
  if (!name || !pillar) {
    return NextResponse.json({ ok: false, error: "name and pillar are required." }, { status: 400 });
  }
  const defaultTags = Array.isArray(body.defaultTags)
    ? body.defaultTags.map((tag) => cleanText(tag)).filter(Boolean).slice(0, 48)
    : [];

  const template = id
    ? await prisma.projectTemplate.update({
        where: { id },
        data: {
          name,
          pillar,
          defaultFields: jsonObject(body.defaultFields),
          defaultTags,
          defaultDeliveryStructure: jsonObject(body.defaultDeliveryStructure),
          defaultAISettings: jsonObject(body.defaultAISettings),
        },
      })
    : await prisma.projectTemplate.create({
        data: {
          name,
          pillar,
          defaultFields: jsonObject(body.defaultFields),
          defaultTags,
          defaultDeliveryStructure: jsonObject(body.defaultDeliveryStructure),
          defaultAISettings: jsonObject(body.defaultAISettings),
        },
      });

  return NextResponse.json({ ok: true, template });
}

