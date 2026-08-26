/**
 * Shared Zod bodies for client gallery + delivery package API routes.
 */
import { z } from "zod";

export const clientAccessCodeBodySchema = z.object({
  code: z.string().min(1, "Missing access code."),
});

export const clientValidateBodySchema = z.object({
  token: z.string().min(1, "Access code is required."),
});

export const clientFavoriteBodySchema = z.object({
  imageId: z.string().min(1, "imageId is required."),
  action: z.enum(["add", "remove"]).optional(),
  note: z.string().max(2000).optional(),
});

export const clientSelectionBodySchema = z.object({
  action: z.enum(["toggle", "submit"]),
  imageId: z.string().min(1).optional(),
  selected: z.boolean().optional(),
});

export const packageFeedbackBodySchema = z.object({
  itemId: z.string().min(1, "itemId is required."),
  eventType: z.enum(["approved", "flagged", "commented", "revision_requested"]),
  comment: z.string().max(4000).optional(),
});

export const packageTrackBodySchema = z.object({
  eventType: z.string().min(1).max(80).optional(),
  itemId: z.string().min(1).optional(),
});
