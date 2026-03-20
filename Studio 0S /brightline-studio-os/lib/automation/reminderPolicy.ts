import type { AutomationContext, Priority } from "@/lib/automation/types";
import type { ReminderType } from "@/lib/reminders/store";

export type ReminderPolicyOutput = {
  dueDate: string;
  message: string;
  priority: Priority;
  reason: string;
};

function daysFromNow(days: number): string {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const diff = t - Date.now();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

export function computeReminderPolicy(params: {
  reminderType: ReminderType;
  ctx: AutomationContext;
}): ReminderPolicyOutput {
  const { reminderType, ctx } = params;

  const urgency = (ctx.urgency ?? "normal").toLowerCase();
  const responsiveness = ctx.clientResponsiveness;
  const size = (ctx.projectSize ?? "medium").toLowerCase();
  const deliverDays = daysUntil(ctx.timeline?.deliverBy);

  let baseDays = reminderType === "payment" ? 1 : reminderType === "delivery" ? 1 : 2;

  if (responsiveness === "slow") baseDays = Math.max(0, baseDays - 1);
  if (responsiveness === "fast") baseDays = baseDays + 1;

  if (size === "large") baseDays = Math.max(0, baseDays - 1);
  if (size === "small") baseDays = baseDays + 1;

  if (deliverDays != null && deliverDays <= 3) baseDays = Math.max(0, Math.min(baseDays, 1));

  let priority: Priority = "normal";
  if (urgency === "urgent") priority = "urgent";
  else if (urgency === "high") priority = "high";
  else if (urgency === "low") priority = "low";
  if (deliverDays != null && deliverDays <= 2) priority = "urgent";

  const dueDate = daysFromNow(baseDays);
  const reasonParts = [
    `Reminder type: ${reminderType}.`,
    `Urgency: ${ctx.urgency ?? "unknown"}.`,
    `Client responsiveness: ${ctx.clientResponsiveness}.`,
    `Project size: ${ctx.projectSize ?? "unknown"}.`,
  ];
  if (ctx.timeline?.deliverBy) reasonParts.push(`Deliver-by: ${ctx.timeline.deliverBy}.`);
  const reason = reasonParts.join(" ");

  const message =
    reminderType === "payment"
      ? "Payment follow-up. Review invoice status and send manually."
      : reminderType === "delivery"
        ? "Delivery follow-up. Confirm client received delivery and respond manually."
        : "Follow up with client. Review status and send manually.";

  return { dueDate, message, priority, reason };
}

