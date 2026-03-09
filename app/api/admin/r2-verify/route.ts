import { NextResponse } from "next/server";
import { hasAdminAccess } from "@/lib/admin-auth";
import { listObjects } from "@/lib/storage-r2";

export const runtime = "nodejs";

/** Verifies R2 connectivity. Call before Browse R2 to surface config errors early. */
export async function GET() {
  try {
    const isAdmin = await hasAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const keys = await listObjects({
      prefix: "portfolio/",
      maxKeys: 1,
    });

    return NextResponse.json({
      ok: true,
      connected: true,
      sampleKey: keys[0] ?? null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "R2 not configured.";
    const isHeaderError =
      typeof message === "string" &&
      (message.includes("Invalid character in header content") ||
        message.toLowerCase().includes("authorization"));
    const payload: {
      ok: false;
      connected: false;
      error: string;
      hint?: string;
    } = {
      ok: false,
      connected: false,
      error: message,
    };
    if (isHeaderError) {
      payload.hint =
        "Check R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY for newlines or quotes. Ensure R2_ENDPOINT, R2_BUCKET are set in Vercel.";
    } else if (message.includes("not configured") || message.includes("R2_BUCKET")) {
      payload.hint =
        "Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET in your deployment environment.";
    }
    console.error("R2_VERIFY_ERROR", err);
    return NextResponse.json(payload, { status: 500 });
  }
}
