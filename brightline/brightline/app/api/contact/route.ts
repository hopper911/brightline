import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { getClientIp, isRateLimited } from "@/lib/permissions/rate-limit";
import { createInquiry, notifyInquiry } from "@/lib/services/contact";

export const runtime = "nodejs";

const contactSchema = z.object({
  name: z.string().min(2, "Please include your name."),
  email: z.string().email("Please use a valid email."),
  message: z.string().min(5, "Please include a short message.").max(2000),
  companyWebsite: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    if (isRateLimited(getClientIp(req))) {
      return NextResponse.json(
        { ok: false, error: "Too many requests." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || "Invalid input." },
        { status: 400 }
      );
    }

    const { companyWebsite, ...data } = parsed.data;

    if (companyWebsite) {
      return NextResponse.json({ ok: true });
    }

    await createInquiry(data);

    try {
      await notifyInquiry(data);
    } catch (emailError) {
      console.error("Contact email failed", emailError);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { ok: false, error: "Something went wrong." },
      { status: 500 }
    );
  }
}
