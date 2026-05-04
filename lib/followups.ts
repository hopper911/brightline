import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { getAppBaseUrl } from "@/lib/stripe-invoices";
import {
  formatBrightlineFromHeader,
  getDefaultBrightlineSender,
} from "@/lib/studio/brightline-email-senders";

export const FOLLOW_UP_TYPES = ["2_day", "7_day", "30_day"] as const;
export type FollowUpType = (typeof FOLLOW_UP_TYPES)[number];

const FOLLOW_UP_OFFSETS: Record<FollowUpType, number> = {
  "2_day": 2,
  "7_day": 7,
  "30_day": 30,
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function resolveFollowUpProject(projectId: string) {
  const project = await prisma.workProject.findUnique({
    where: { id: projectId },
    include: {
      deliveryPackages: {
        include: { client: true },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });
  if (!project) throw new Error("Project not found.");

  const deliveryPackage = project.deliveryPackages[0] ?? null;
  let client = deliveryPackage?.client ?? null;
  if (!client && project.studioProjectId) {
    const studioProject = await prisma.studioProject.findUnique({
      where: { id: project.studioProjectId },
      include: { studioClient: true },
    });
    client = studioProject?.studioClient ?? null;
  }
  if (!client) throw new Error("Project is not linked to a Studio client.");
  if (!client.email) throw new Error("Studio client is missing an email address.");

  const token = deliveryPackage?.accessToken ?? project.finalPackageToken;
  const deliveryUrl = token ? `${getAppBaseUrl()}/package/${token}` : null;
  const deliveryDate = deliveryPackage?.deliveryDate ?? project.deliveryPreparedAt ?? new Date();
  return { project, client, deliveryPackage, deliveryUrl, deliveryDate };
}

export async function scheduleProjectFollowUps(projectId: string) {
  const { client, deliveryDate } = await resolveFollowUpProject(projectId);
  const rows = [];
  for (const type of FOLLOW_UP_TYPES) {
    rows.push(await prisma.followUpSchedule.upsert({
      where: { projectId_type: { projectId, type } },
      update: {
        clientId: client.id,
        scheduledAt: addDays(deliveryDate, FOLLOW_UP_OFFSETS[type]),
        sentAt: null,
        status: "pending",
        error: null,
      },
      create: {
        projectId,
        clientId: client.id,
        type,
        scheduledAt: addDays(deliveryDate, FOLLOW_UP_OFFSETS[type]),
      },
    }));
  }
  return rows;
}

function followUpCopy(type: FollowUpType, input: { projectName: string; deliveryUrl: string | null }) {
  const linkLine = input.deliveryUrl ? `\n\nYour delivery link is here:\n${input.deliveryUrl}` : "";
  if (type === "2_day") {
    return {
      subject: `Everything looking good with ${input.projectName}?`,
      text: `Hi,\n\nI wanted to check in now that your Bright Line delivery is in hand. Does everything look good, or do you need any small adjustments?${linkLine}\n\nBest,\nBright Line Photography`,
    };
  }
  if (type === "7_day") {
    return {
      subject: `Need help using the images from ${input.projectName}?`,
      text: `Hi,\n\nChecking in to see if you need help using the images for your site, marketing, listings, decks, or social posts. I can point you toward the strongest selects and best use cases if useful.${linkLine}\n\nBest,\nBright Line Photography`,
    };
  }
  return {
    subject: `Ready for your next shoot or additional content?`,
    text: `Hi,\n\nIt has been a little while since your Bright Line delivery. If you are planning the next campaign, listing, launch, or content refresh, I would be happy to help map out what to photograph next.${linkLine}\n\nBest,\nBright Line Photography`,
  };
}

function htmlFromText(text: string) {
  return `<div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#111;max-width:640px">${escapeHtml(text).replace(/\n/g, "<br />")}</div>`;
}

export async function sendDueFollowUps(limit = 25) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY is not set.");

  const due = await prisma.followUpSchedule.findMany({
    where: { status: "pending", scheduledAt: { lte: new Date() } },
    include: {
      project: {
        include: {
          deliveryPackages: {
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
      },
      client: true,
    },
    orderBy: { scheduledAt: "asc" },
    take: limit,
  });

  const resend = new Resend(apiKey);
  let sent = 0;
  let failed = 0;

  for (const row of due) {
    try {
      if (!row.client.email) throw new Error("Client email is missing.");
      const deliveryPackage = row.project.deliveryPackages[0] ?? null;
      const deliveryUrl = (deliveryPackage?.accessToken ?? row.project.finalPackageToken)
        ? `${getAppBaseUrl()}/package/${deliveryPackage?.accessToken ?? row.project.finalPackageToken}`
        : null;
      const copy = followUpCopy(row.type as FollowUpType, {
        projectName: row.project.title,
        deliveryUrl,
      });
      const { error } = await resend.emails.send({
        from: formatBrightlineFromHeader(getDefaultBrightlineSender()),
        to: row.client.email,
        subject: copy.subject,
        text: copy.text,
        html: htmlFromText(copy.text),
      });
      if (error) throw new Error(error.message);

      await prisma.followUpSchedule.update({
        where: { id: row.id },
        data: { status: "sent", sentAt: new Date(), error: null },
      });
      if (deliveryPackage) {
        await prisma.packageAccessLog.create({
          data: {
            deliveryPackageId: deliveryPackage.id,
            eventType: `followup_${row.type}_sent`,
          },
        }).catch(() => null);
      }
      sent += 1;
    } catch (err) {
      failed += 1;
      await prisma.followUpSchedule.update({
        where: { id: row.id },
        data: {
          status: "failed",
          error: err instanceof Error ? err.message : "Follow-up send failed.",
        },
      }).catch(() => null);
    }
  }

  return { checked: due.length, sent, failed };
}

