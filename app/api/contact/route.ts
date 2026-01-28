import { NextResponse } from "next/server";
import { assertServerEnv } from "@/lib/env";
import { getClientIp, isRateLimited } from "@/lib/permissions/rate-limit";
import {
  createContactMessage,
  normalizeContactPayload,
  notifyContact,
  validateContactPayload,
} from "@/lib/services/contact";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    assertServerEnv();

    if (isRateLimited(getClientIp(req))) {
      return NextResponse.json(
        { ok: false, error: "Too many requests." },
        { status: 429 }
      );
    }

    const payload = normalizeContactPayload(await req.json());
    const validation = validateContactPayload(payload);

    if (!validation.ok) {
      return NextResponse.json(
        { ok: false, error: validation.error },
        { status: 400 }
      );
    }

    if (validation.silent) {
      return NextResponse.json({ ok: true });
    }

    await createContactMessage(payload);
    await notifyContact(payload);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Something went wrong." },
      { status: 500 }
    );
  }
}
