import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { assertServerEnv } from "@/lib/env";
import { getClientIp, isRateLimited } from "@/lib/permissions/rate-limit";
import { createLead, notifyLead } from "@/lib/services/contact";

export const runtime = "nodejs";

const baseSchema = z.object({
  name: z.string().min(2, "Please include your name."),
  email: z.string().email("Please use a valid email."),
  company: z.string().optional(),
  service: z.string().optional(),
  budget: z.string().optional(),
  turnstileToken: z.string().min(1, "Spam check required."),
  website: z.string().optional(), // honeypot field
});

const inquirySchema = baseSchema.extend({
  type: z.literal("inquiry"),
  message: z.string().min(5, "Please include a short message.").max(2000),
});

const availabilitySchema = baseSchema.extend({
  type: z.literal("availability"),
  availabilityStart: z.string().min(1, "Please include a start date."),
  availabilityEnd: z.string().min(1, "Please include an end date."),
  location: z.string().min(2, "Please include a location."),
  shootType: z.string().min(2, "Please include a shoot type."),
  message: z.string().max(2000).optional().or(z.literal("")),
});

const contactSchema = z.discriminatedUnion("type", [
  inquirySchema,
  availabilitySchema,
]);

async function verifyTurnstile(token: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const bypass = process.env.TURNSTILE_BYPASS === "true";

  if (bypass) return true;
  if (!secret) {
    throw new Error("Turnstile secret not configured.");
  }

  if (secret === "test" || secret === "test-secret") {
    return token === "test";
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  const data = (await res.json()) as { success?: boolean };
  return Boolean(data.success);
}

export async function POST(req: Request) {
  try {
    assertServerEnv();

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

    const payload = parsed.data;
    
    // Honeypot check (server-side)
    if (payload.website) {
      return NextResponse.json(
        { ok: false, error: "Invalid submission." },
        { status: 400 }
      );
    }
    
    const isValid = await verifyTurnstile(payload.turnstileToken);
    if (!isValid) {
      return NextResponse.json(
        { ok: false, error: "Spam check failed." },
        { status: 400 }
      );
    }

    const contactPayload = {
      type: payload.type,
      name: payload.name,
      email: payload.email,
      message:
        "message" in payload && payload.message ? payload.message : undefined,
      company: payload.company,
      service: payload.service,
      budget: payload.budget || undefined,
      availabilityStart:
        "availabilityStart" in payload && payload.availabilityStart
          ? new Date(payload.availabilityStart)
          : undefined,
      availabilityEnd:
        "availabilityEnd" in payload && payload.availabilityEnd
          ? new Date(payload.availabilityEnd)
          : undefined,
      location: "location" in payload ? payload.location || undefined : undefined,
      shootType: "shootType" in payload ? payload.shootType || undefined : undefined,
    };

    try {
      await createLead(contactPayload);
    } catch (dbError) {
      console.error("TODO: persist contact lead in DB", dbError);
    }

    try {
      await notifyLead(contactPayload);
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
