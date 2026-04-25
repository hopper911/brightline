import { prisma } from "@/lib/prisma";

export type CreateInquiryInput = {
  name: string;
  email: string;
  message: string;
  company?: string;
  projectType?: string;
  budget?: string;
  location?: string;
  timeline?: string;
};

export async function createInquiry(data: CreateInquiryInput) {
  return prisma.inquiry.create({
    data: {
      name: data.name,
      email: data.email,
      message: data.message,
      company: data.company ?? null,
      projectType: data.projectType ?? null,
      budget: data.budget ?? null,
      location: data.location ?? null,
      timeline: data.timeline ?? null,
    },
  });
}
