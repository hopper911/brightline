import { NextResponse } from "next/server";
import { assertServerEnv } from "@/lib/env";
import { handleStorage, normalizeStoragePayload } from "@/lib/services/storage";

export async function POST(req: Request) {
  try {
    assertServerEnv();
    const payload = normalizeStoragePayload(await req.json());
    const result = await handleStorage(payload);

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, ...result.data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Failed to create signed URL." },
      { status: 500 }
    );
  }
}
