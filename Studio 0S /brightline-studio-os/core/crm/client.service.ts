/**
 * Client service – CRM business logic
 */

import { prisma } from "@/lib/prisma";

export type CreateClientInput = {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  notes?: string;
};

export type UpdateClientInput = Partial<CreateClientInput>;

export const clientService = {
  async list(options?: { limit?: number }) {
    const clients = await prisma.client.findMany({
      orderBy: { updatedAt: "desc" },
      take: options?.limit ?? 100,
      include: {
        _count: { select: { projects: true, leads: true } },
      },
    });
    return clients;
  },

  async getById(id: string) {
    return prisma.client.findUnique({
      where: { id },
      include: {
        projects: { orderBy: { updatedAt: "desc" }, take: 20 },
        leads: true,
      },
    });
  },

  async create(data: CreateClientInput) {
    return prisma.client.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        company: data.company ?? null,
        notes: data.notes ?? null,
      },
    });
  },

  async update(id: string, data: UpdateClientInput) {
    return prisma.client.update({
      where: { id },
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.email != null && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone ?? null }),
        ...(data.company !== undefined && { company: data.company ?? null }),
        ...(data.notes !== undefined && { notes: data.notes ?? null }),
      },
    });
  },
};
