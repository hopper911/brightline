/**
 * Lead service – CRM business logic
 */

import { prisma } from "@/lib/prisma";

export type LeadStatus = "new" | "contacted" | "qualified" | "closed";

export type CreateLeadInput = {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  source?: string;
  notes?: string;
};

export type UpdateLeadInput = Partial<CreateLeadInput> & { status?: LeadStatus };

export const leadService = {
  async list(options?: { status?: LeadStatus; limit?: number }) {
    const leads = await prisma.lead.findMany({
      where: options?.status ? { status: options.status } : undefined,
      orderBy: { updatedAt: "desc" },
      take: options?.limit ?? 100,
      include: { client: true },
    });
    return leads;
  },

  async getById(id: string) {
    return prisma.lead.findUnique({
      where: { id },
      include: { client: true },
    });
  },

  async create(data: CreateLeadInput) {
    return prisma.lead.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        company: data.company ?? null,
        source: data.source ?? null,
        notes: data.notes ?? null,
      },
    });
  },

  async update(id: string, data: UpdateLeadInput) {
    return prisma.lead.update({
      where: { id },
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.email != null && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone ?? null }),
        ...(data.company !== undefined && { company: data.company ?? null }),
        ...(data.source !== undefined && { source: data.source ?? null }),
        ...(data.status != null && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes ?? null }),
      },
    });
  },

  async convertToClient(leadId: string) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new Error("Lead not found");
    if (lead.clientId) throw new Error("Lead already converted");

    const client = await prisma.client.create({
      data: {
        name: lead.name,
        email: lead.email,
        phone: lead.phone ?? null,
        company: lead.company ?? null,
        notes: lead.notes ?? null,
      },
    });

    await prisma.lead.update({
      where: { id: leadId },
      data: { clientId: client.id, status: "closed", convertedAt: new Date() },
    });

    return client;
  },
};
