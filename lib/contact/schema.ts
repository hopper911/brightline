import { z } from "zod";

/** Shared contact form schema — used by `/api/contact` and authz tests. */
export const contactSchema = z.object({
  name: z.string().min(2, "Please include your name."),
  email: z.string().email("Please use a valid email."),
  message: z.string().min(5, "Please include a short message.").max(2000),
  company: z.string().optional(),
  projectType: z.string().optional(),
  budget: z.string().optional(),
  location: z.string().optional(),
  timeline: z.string().optional(),
  companyWebsite: z.string().optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;
