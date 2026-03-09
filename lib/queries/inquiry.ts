import { prisma } from "@/lib/prisma";

export type CreateInquiryInput = {
  name: string;
  email: string;
  message: string;
};

export async function createInquiry(data: CreateInquiryInput) {
  return prisma.inquiry.create({
    data: {
      name: data.name,
      email: data.email,
      message: data.message,
    },
  });
}
