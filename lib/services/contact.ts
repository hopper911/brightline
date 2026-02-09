import { prisma } from "@/lib/prisma";

type LeadPayload = {
  type: "inquiry" | "availability";
  name: string;
  email: string;
  message?: string;
  company?: string;
  service?: string;
  budget?: string;
  availabilityStart?: Date;
  availabilityEnd?: Date;
  location?: string;
  shootType?: string;
};

export async function createLead(payload: LeadPayload) {
  try {
    await prisma.lead.create({
      data: {
        type: payload.type,
        status: "new",
        score: 0,
        name: payload.name,
        email: payload.email,
        message: payload.message || null,
        company: payload.company || null,
        service: payload.service || null,
        budget: payload.budget || null,
        availabilityStart: payload.availabilityStart || null,
        availabilityEnd: payload.availabilityEnd || null,
        location: payload.location || null,
        shootType: payload.shootType || null,
        source: "contact",
      },
    });
  } catch {
    // Swallow DB errors in production for now
  }
}

export async function notifyLead(payload: LeadPayload) {
  const notifyEmail = process.env.CONTACT_NOTIFY_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!notifyEmail || !apiKey || !from) return;

  const body = [
    `New ${payload.type} inquiry`,
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    payload.company ? `Company: ${payload.company}` : null,
    payload.service ? `Service: ${payload.service}` : null,
    payload.budget ? `Budget: ${payload.budget}` : null,
    payload.location ? `Location: ${payload.location}` : null,
    payload.shootType ? `Shoot type: ${payload.shootType}` : null,
    payload.availabilityStart
      ? `Availability start: ${payload.availabilityStart.toDateString()}`
      : null,
    payload.availabilityEnd
      ? `Availability end: ${payload.availabilityEnd.toDateString()}`
      : null,
    payload.message ? `Message: ${payload.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: notifyEmail,
      subject: `New ${payload.type} inquiry`,
      text: body,
    }),
  });
}
