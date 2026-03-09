import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function escapeCsv(value: string) {
  if (value.includes("\"") || value.includes(",") || value.includes("\n")) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }
  return value;
}

export async function GET() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "id",
    "type",
    "status",
    "score",
    "name",
    "email",
    "phone",
    "company",
    "service",
    "budget",
    "message",
    "availabilityStart",
    "availabilityEnd",
    "location",
    "shootType",
    "source",
    "internalNotes",
    "contactedAt",
    "createdAt",
    "updatedAt",
  ];

  const rows = leads.map((lead) =>
    [
      lead.id,
      lead.type ?? "",
      lead.status ?? "",
      lead.score ?? 0,
      lead.name ?? "",
      lead.email ?? "",
      lead.phone ?? "",
      lead.company ?? "",
      lead.service ?? "",
      lead.budget ?? "",
      lead.message ?? "",
      lead.availabilityStart?.toISOString() ?? "",
      lead.availabilityEnd?.toISOString() ?? "",
      lead.location ?? "",
      lead.shootType ?? "",
      lead.source ?? "",
      lead.internalNotes ?? "",
      lead.contactedAt?.toISOString() ?? "",
      lead.createdAt.toISOString(),
      lead.updatedAt?.toISOString() ?? "",
    ].map((value) => escapeCsv(String(value)))
  );

  const csv = [header.join(","), ...rows.map((row) => row.join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"leads.csv\"",
      "Cache-Control": "no-store",
    },
  });
}
