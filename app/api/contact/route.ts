import { jsonErr, jsonOk, parseJsonBody } from "@/lib/api/http";
import { getClientIp, isRateLimited } from "@/lib/permissions/rate-limit";
import { createInquiry, notifyInquiry } from "@/lib/services/contact";
import { z } from "zod";

export const runtime = "nodejs";

const contactSchema = z.object({
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

export async function POST(req: Request) {
  try {
    if (isRateLimited(getClientIp(req))) {
      return jsonErr("Too many requests.", 429);
    }

    const parsedBody = await parseJsonBody(req);
    if (!parsedBody.ok) return parsedBody.response;

    const parsed = contactSchema.safeParse(parsedBody.value);
    if (!parsed.success) {
      return jsonErr(parsed.error.issues[0]?.message || "Invalid input.", 400, {
        code: "validation_error",
      });
    }

    const { companyWebsite, ...data } = parsed.data;

    if (companyWebsite) {
      return jsonOk({});
    }

    await createInquiry({
      name: data.name,
      email: data.email,
      message: data.message,
      company: data.company || undefined,
      projectType: data.projectType || undefined,
      budget: data.budget || undefined,
      location: data.location || undefined,
      timeline: data.timeline || undefined,
    });

    try {
      await notifyInquiry({
        name: data.name,
        email: data.email,
        message: data.message,
        company: data.company,
        projectType: data.projectType,
        budget: data.budget,
        location: data.location,
        timeline: data.timeline,
      });
    } catch (emailError) {
      console.error("Contact email failed", emailError);
    }

    return jsonOk({});
  } catch {
    return jsonErr("Something went wrong.", 500);
  }
}
