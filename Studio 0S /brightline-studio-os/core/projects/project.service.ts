/**
 * Project service – project management business logic
 */

import { prisma } from "@/lib/prisma";

export type ProjectStatus = "draft" | "active" | "completed" | "archived";

export type CreateProjectInput = {
  name: string;
  clientId?: string;
  status?: ProjectStatus;
  shootDate?: Date | string;
  notes?: string;
};

export type UpdateProjectInput = {
  name?: string;
  clientId?: string;
  status?: ProjectStatus;
  shootDate?: Date | string | null;
  notes?: string | null;
};

export const projectService = {
  async list(options?: { clientId?: string; status?: ProjectStatus; limit?: number }) {
    const projects = await prisma.project.findMany({
      where: {
        ...(options?.clientId && { clientId: options.clientId }),
        ...(options?.status && { status: options.status }),
      },
      orderBy: { updatedAt: "desc" },
      take: options?.limit ?? 100,
      include: { client: true },
    });
    return projects;
  },

  async getById(id: string) {
    return prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        tasks: { orderBy: { createdAt: "asc" } },
      },
    });
  },

  async create(data: CreateProjectInput) {
    return prisma.project.create({
      data: {
        name: data.name,
        clientId: data.clientId ?? null,
        status: data.status ?? "draft",
        shootDate: data.shootDate ? new Date(data.shootDate) : null,
        notes: data.notes ?? null,
      },
      include: { client: true },
    });
  },

  async update(id: string, data: UpdateProjectInput) {
    return prisma.project.update({
      where: { id },
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.clientId !== undefined && { clientId: data.clientId ?? null }),
        ...(data.status != null && { status: data.status }),
        ...(data.shootDate !== undefined && {
          shootDate: data.shootDate ? new Date(data.shootDate) : null,
        }),
        ...(data.notes !== undefined && { notes: data.notes ?? null }),
      },
      include: { client: true },
    });
  },
};
