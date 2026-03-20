import { NextResponse } from "next/server";
import { clientService } from "@/core/crm/client.service";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;

    const clients = await clientService.list({ limit });
    return NextResponse.json(clients);
  } catch (err) {
    console.error("GET /api/clients:", err);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const client = await clientService.create(parsed.data);
    return NextResponse.json(client);
  } catch (err) {
    console.error("POST /api/clients:", err);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
