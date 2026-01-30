import { prisma } from "@/lib/prisma";

export type LeadPayload = {
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

const budgetScoreMap: Record<string, number> = {
  "under-5k": 2,
  "5k-10k": 6,
  "10k-25k": 12,
  "25k-plus": 18,
};

export function computeLeadScore(payload: LeadPayload) {
  let score = 0;
  if (payload.company) score += 10;
  if (payload.service && payload.service !== "general") score += 6;
  if (payload.message) {
    const length = payload.message.trim().length;
    if (length > 300) score += 10;
    else if (length > 150) score += 6;
    else if (length > 50) score += 3;
  }
  if (payload.budget && payload.budget in budgetScoreMap) {
    score += budgetScoreMap[payload.budget] || 0;
  }
  return Math.min(score, 50);
}

export async function createLead(payload: LeadPayload) {
  const score = computeLeadScore(payload);
  await prisma.lead.create({
    data: {
      type: payload.type,
      name: payload.name,
      email: payload.email,
      company: payload.company,
      service: payload.service,
      budget: payload.budget,
      message: payload.message,
      availabilityStart: payload.availabilityStart,
      availabilityEnd: payload.availabilityEnd,
      location: payload.location,
      shootType: payload.shootType,
      source: "contact",
      score,
    },
  });
}

function formatDate(date?: Date) {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function notifyLead(payload: LeadPayload) {
  const adminEmail = process.env.CONTACT_NOTIFY_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "Bright Line <no-reply@brightlinephotography.co>";
  if (!adminEmail || !resendKey) return;

  const subject =
    payload.type === "availability"
      ? `Availability request from ${payload.name}`
      : `New inquiry from ${payload.name}`;

  const ownerBodyLines =
    payload.type === "availability"
      ? [
          "Availability request",
          "--------------------",
          `Name: ${payload.name}`,
          `Email: ${payload.email}`,
          payload.company ? `Company: ${payload.company}` : "",
          payload.service ? `Service: ${payload.service}` : "",
          payload.budget ? `Budget: ${payload.budget}` : "",
          "",
          "Schedule summary",
          "----------------",
          `Date range: ${formatDate(payload.availabilityStart)} – ${formatDate(payload.availabilityEnd)}`,
          payload.location ? `Location: ${payload.location}` : "",
          payload.shootType ? `Shoot type: ${payload.shootType}` : "",
          payload.message ? "" : "",
          payload.message ? "Notes" : "",
          payload.message ? "-----" : "",
          payload.message ? payload.message : "",
        ]
      : [
          "New inquiry",
          "-----------",
          `Name: ${payload.name}`,
          `Email: ${payload.email}`,
          payload.company ? `Company: ${payload.company}` : "",
          payload.service ? `Service: ${payload.service}` : "",
          payload.budget ? `Budget: ${payload.budget}` : "",
          "",
          payload.message || "",
        ];

  const ownerBody = ownerBodyLines.filter(Boolean).join("\n");

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [adminEmail],
      subject,
      text: ownerBody,
    }),
  });

  const clientBody =
    payload.type === "availability"
      ? [
          `Hi ${payload.name},`,
          "",
          "Thanks for checking availability with Bright Line Photography. We received your request and will reply within 24 hours with next steps.",
          "",
          "— Bright Line",
        ].join("\n")
      : [
          `Hi ${payload.name},`,
          "",
          "Thanks for reaching out to Bright Line Photography. We received your message and will reply within 24 hours.",
          "",
          "— Bright Line",
        ].join("\n");

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [payload.email],
      subject: "We received your inquiry",
      text: clientBody,
    }),
  });
}
