import { NextResponse } from "next/server";
import type { z } from "zod";
import { jsonErr, parseJsonBody } from "@/lib/api/http";

/**
 * Parse JSON body then validate with Zod.
 * Returns typed data or a standard `{ ok: false, error }` response.
 */
export async function parseJsonWithSchema<T extends z.ZodType>(
  req: Request,
  schema: T
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: NextResponse }> {
  const parsedBody = await parseJsonBody(req);
  if (!parsedBody.ok) return parsedBody;

  const parsed = schema.safeParse(parsedBody.value);
  if (!parsed.success) {
    return {
      ok: false,
      response: jsonErr(parsed.error.issues[0]?.message || "Invalid input.", 400, {
        code: "validation_error",
      }),
    };
  }
  return { ok: true, data: parsed.data };
}
