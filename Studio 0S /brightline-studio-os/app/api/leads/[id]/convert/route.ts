import { NextResponse } from "next/server";
import { leadService } from "@/core/crm/lead.service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await leadService.convertToClient(id);
    return NextResponse.json(client);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to convert lead";
    if (msg === "Lead not found") {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    if (msg === "Lead already converted") {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    console.error("POST /api/leads/[id]/convert:", err);
    return NextResponse.json({ error: "Failed to convert lead" }, { status: 500 });
  }
}
