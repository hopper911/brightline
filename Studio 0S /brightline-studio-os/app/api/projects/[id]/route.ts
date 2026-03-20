import { NextResponse } from "next/server";
import { projectService } from "@/core/projects/project.service";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  clientId: z.string().nullable().optional(),
  status: z.enum(["draft", "active", "completed", "archived"]).optional(),
  shootDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await projectService.getById(id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json(project);
  } catch (err) {
    console.error("GET /api/projects/[id]:", err);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const project = await projectService.update(id, {
      ...parsed.data,
      shootDate: parsed.data.shootDate,
    });
    return NextResponse.json(project);
  } catch (err) {
    console.error("PATCH /api/projects/[id]:", err);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}
