import { NextResponse } from "next/server";
import { leadService } from "@/core/crm/lead.service";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial().extend({
  status: z.enum(["new", "contacted", "qualified", "closed"]).optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as "new" | "contacted" | "qualified" | "closed" | null;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;

    const leads = await leadService.list({ status: status ?? undefined, limit });
    return NextResponse.json(leads);
  } catch (err) {
    console.error("GET /api/leads:", err);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const lead = await leadService.create(parsed.data);
    return NextResponse.json(lead);
  } catch (err) {
    console.error("POST /api/leads:", err);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
