import { prisma } from "@/lib/prisma";

export type ContactPayload = {
  name: string;
  email: string;
  message: string;
  honeypot?: string;
};

export function normalizeContactPayload(body: unknown) {
  const data = body as Record<string, unknown> | null;
  return {
    name: typeof data?.name === "string" ? data.name.trim() : "",
    email: typeof data?.email === "string" ? data.email.trim() : "",
    message: typeof data?.message === "string" ? data.message.trim() : "",
    honeypot: typeof data?.company === "string" ? data.company.trim() : "",
  };
}

export function validateContactPayload(payload: ContactPayload) {
  if (payload.honeypot) return { ok: true, silent: true } as const;
  if (!payload.name || !payload.email || !payload.message) {
    return { ok: false, error: "Missing required fields." } as const;
  }
  return { ok: true, silent: false } as const;
}

export async function createContactMessage(payload: ContactPayload) {
  await prisma.contactMessage.create({
    data: {
      name: payload.name,
      email: payload.email,
      message: payload.message,
    },
  });
}

export async function notifyContact(payload: ContactPayload) {
  const adminEmail = process.env.CONTACT_NOTIFY_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;
  if (!adminEmail || !resendKey) return;

  const subject = `New inquiry from ${payload.name}`;
  const content = [
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    "",
    payload.message,
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
