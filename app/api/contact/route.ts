import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;

const rateLimit = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return "unknown";
}

function isRateLimited(key: string) {
  const now = Date.now();
  const entry = rateLimit.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  if (entry.count >= MAX_REQUESTS) {
    return true;
  }
  entry.count += 1;
  return false;
}

export async function POST(req: Request) {
  try {
    if (isRateLimited(getClientIp(req))) {
      return NextResponse.json(
        { ok: false, error: "Too many requests." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const honeypot = typeof body?.company === "string" ? body.company.trim() : "";

    if (honeypot) {
      return NextResponse.json({ ok: true });
    }

    if (!name || !email || !message) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    await prisma.contactMessage.create({
      data: { name, email, message },
    });

    const adminEmail = process.env.CONTACT_NOTIFY_EMAIL;
    const resendKey = process.env.RESEND_API_KEY;
    if (adminEmail && resendKey) {
      const subject = `New inquiry from ${name}`;
      const content = [
        `Name: ${name}`,
        `Email: ${email}`,
        "",
        message,
      ].join("\n");

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Bright Line <no-reply@brightlinephotography.co>",
          to: [adminEmail],
          subject,
          text: content,
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Something went wrong." },
      { status: 500 }
    );
  }
}
