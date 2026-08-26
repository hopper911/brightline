import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertPermission,
  auditAccountantAction,
  getAccountantPortalContextFromRequest,
} from "@/lib/accountant/auth";
import { rowsToCsv } from "@/lib/accountant/csv";
import { loadUnifiedLedger } from "@/lib/accountant/ledger-query";
import { buildDocumentKey } from "@/lib/accountant/r2-keys";
import { prisma } from "@/lib/prisma";
import { putObjectBuffer } from "@/lib/storage-r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  title: z.string().min(1).optional(),
  kind: z.string().min(1).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  persist: z.boolean().optional(),
});

export async function POST(req: Request) {
  const ctx = await getAccountantPortalContextFromRequest(req);
  if (!ctx) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  try {
    assertPermission(ctx, "canExportReports");
  } catch (e: unknown) {
    const st = typeof e === "object" && e && "status" in e ? (e as { status: number }).status : 403;
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: st });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid body." }, { status: 400 });
  }

  const title = parsed.data.title?.trim() || "Ledger export";
  const kind = parsed.data.kind?.trim() || "ledger_csv";

  let from: Date | undefined;
  let to: Date | undefined;
  if (parsed.data.from) {
    const d = new Date(parsed.data.from);
    if (!Number.isNaN(d.getTime())) from = d;
  }
  if (parsed.data.to) {
    const d = new Date(parsed.data.to);
    if (!Number.isNaN(d.getTime())) to = d;
  }

  const rows = await loadUnifiedLedger(prisma, { from, to });
  const csv = rowsToCsv(
    ["date", "source", "ledgerType", "category", "description", "amount", "client", "project", "invoiceNumber"],
    rows.map((r) => [
      r.transactionDate.toISOString(),
      r.source,
      r.ledgerType,
      r.category,
      r.description,
      r.amount,
      r.clientName ?? "",
      r.projectTitle ?? "",
      r.invoiceNumber ?? "",
    ])
  );

  await auditAccountantAction({
    ctx,
    action: "accountant.report.generate",
    metadata: { rowCount: rows.length, persist: Boolean(parsed.data.persist) },
    req,
  });

  if (parsed.data.persist) {
    const { key } = buildDocumentKey(`${title.replace(/[^a-zA-Z0-9._-]+/g, "_")}.csv`);
    const buf = Buffer.from(csv, "utf8");
    try {
      await putObjectBuffer({ key, body: buf, contentType: "text/csv", access: "private" });
    } catch {
      return NextResponse.json({ ok: false, error: "Storage upload failed." }, { status: 500 });
    }

    const doc = await prisma.accountingDocument.create({
      data: {
        title,
        kind,
        dateRangeStart: from ?? null,
        dateRangeEnd: to ?? null,
        r2Key: key,
        mimeType: "text/csv",
        sizeBytes: buf.byteLength,
        generatedByAccountantId: ctx.kind === "accountant" ? ctx.accountantAccess.id : null,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, documentId: doc.id, key });
  }

  const stamp = new Date().toISOString().slice(0, 7);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="brightline-ledger-report-${stamp}.csv"`,
    },
  });
}
