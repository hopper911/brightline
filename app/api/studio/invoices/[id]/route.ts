import { guardAdminJson } from "@/lib/api/guards";
import { jsonErr, jsonOk } from "@/lib/api/http";
import { getStudioInvoiceDetailForAdmin } from "@/lib/data/studio-invoices";
import { asNullableString, parseDate, parseMoney } from "@/lib/studio/finance";
import {
  normalizeStudioInvoiceStatus,
  recalculateInvoiceFinance,
} from "@/lib/studio/invoicing";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;

  const { id } = await context.params;

  const invoice = await getStudioInvoiceDetailForAdmin(id);

  if (!invoice) {
    return jsonErr("Not found.", 404);
  }

  return jsonOk({ invoice });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;

  const { id } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonErr("Invalid JSON.", 400);
  }

  const clientIdRaw =
    body.clientId !== undefined ? asNullableString(body.clientId) : undefined;
  const projectIdRaw =
    body.projectId === null || body.projectId === ""
      ? null
      : body.projectId !== undefined
        ? asNullableString(body.projectId)
        : undefined;

  const explicitStatus = normalizeStudioInvoiceStatus(body.status);
  const notes = body.notes !== undefined ? asNullableString(body.notes) : undefined;
  const tax = body.tax !== undefined ? parseMoney(body.tax, "tax") : undefined;
  const discount = body.discount !== undefined ? parseMoney(body.discount, "discount") : undefined;

  const issuedAt =
    body.issuedAt !== undefined
      ? body.issuedAt === null || body.issuedAt === ""
        ? null
        : parseDate(body.issuedAt)
      : undefined;
  const dueAt =
    body.dueAt !== undefined
      ? body.dueAt === null || body.dueAt === ""
        ? null
        : parseDate(body.dueAt)
      : undefined;
  const sentAt =
    body.sentAt !== undefined
      ? body.sentAt === null || body.sentAt === ""
        ? null
        : parseDate(body.sentAt)
      : undefined;

  const patchData: Parameters<typeof prisma.studioInvoice.update>[0]["data"] = {};
  if (notes !== undefined) patchData.notes = notes;
  if (tax !== undefined) patchData.tax = tax;
  if (discount !== undefined) patchData.discount = discount;
  if (issuedAt !== undefined) patchData.issuedAt = issuedAt;
  if (dueAt !== undefined) patchData.dueAt = dueAt;
  if (sentAt !== undefined) patchData.sentAt = sentAt;
  if (explicitStatus !== undefined) {
    patchData.status = explicitStatus;
    if (explicitStatus === "SENT" && !(patchData.sentAt instanceof Date)) {
      patchData.sentAt = new Date();
    }
  }

  try {
    const invoice = await prisma.$transaction(async (tx) => {
      const existing = await tx.studioInvoice.findUnique({
        where: { id },
        select: { clientId: true, projectId: true },
      });
      if (!existing) {
        throw new Error("Invoice not found.");
      }

      let nextClientId = existing.clientId;
      if (clientIdRaw !== undefined) {
        if (!clientIdRaw) {
          throw new Error("clientId cannot be empty.");
        }
        const client = await tx.studioClient.findUnique({
          where: { id: clientIdRaw },
          select: { id: true },
        });
        if (!client) {
          throw new Error("Client not found.");
        }
        nextClientId = clientIdRaw;
        patchData.clientId = clientIdRaw;
        if (clientIdRaw !== existing.clientId && existing.projectId) {
          const linked = await tx.studioProject.findUnique({
            where: { id: existing.projectId },
            select: { clientId: true },
          });
          if (linked?.clientId !== clientIdRaw) {
            patchData.projectId = null;
          }
        }
      }

      if (projectIdRaw !== undefined) {
        if (projectIdRaw === null) {
          patchData.projectId = null;
        } else {
          const proj = await tx.studioProject.findUnique({
            where: { id: projectIdRaw },
            select: { clientId: true },
          });
          if (!proj) {
            throw new Error("Project not found.");
          }
          if (proj.clientId !== nextClientId) {
            throw new Error("Project does not belong to the invoice client.");
          }
          patchData.projectId = projectIdRaw;
        }
      }

      await tx.studioInvoice.update({
        where: { id },
        data: patchData,
      });
      return recalculateInvoiceFinance(tx, id, explicitStatus);
    });
    return jsonOk({ invoice });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed.";
    return jsonErr(message, 400);
  }
}
