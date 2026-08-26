import { jsonErr, jsonOk } from "@/lib/api/http";
import { parseJsonWithSchema } from "@/lib/api/parse";
import { contactSchema } from "@/lib/contact/schema";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";
import { createInquiry, notifyInquiry } from "@/lib/services/contact";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const fetchSite = (req.headers.get("sec-fetch-site") || "").toLowerCase();
    if (fetchSite === "cross-site") {
      return jsonErr("Forbidden origin.", 403);
    }

    if (
      await isRateLimitedAsync(getClientIp(req), {
        scope: "contact",
        max: 8,
        windowMs: 15 * 60_000,
      })
    ) {
      return jsonErr("Too many requests.", 429);
    }

    const parsed = await parseJsonWithSchema(req, contactSchema);
    if (!parsed.ok) return parsed.response;

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
