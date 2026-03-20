import { NextResponse } from "next/server";
import { projectService } from "@/core/projects/project.service";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  clientId: z.string().optional(),
  status: z.enum(["draft", "active", "completed", "archived"]).optional(),
  shootDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId") ?? undefined;
    const status = searchParams.get("status") as
      | "draft"
      | "active"
      | "completed"
      | "archived"
      | undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;

    const projects = await projectService.list({ clientId, status, limit });
    return NextResponse.json(projects);
  } catch (err) {
    console.error("GET /api/projects:", err);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const project = await projectService.create({
      ...parsed.data,
      shootDate: parsed.data.shootDate,
    });
    return NextResponse.json(project);
  } catch (err) {
    console.error("POST /api/projects:", err);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
