import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { assertServerEnv } from "@/lib/env";
import { isAdminSignableMediaKey } from "@/lib/media-key-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    assertServerEnv();
    const { handleStorage, normalizeStoragePayload } = await import(
      "@/lib/services/storage"
    );
    const payload = normalizeStoragePayload(await req.json());

    const key = payload.key?.trim().replace(/^\/+/, "") ?? "";
    if (!key || !isAdminSignableMediaKey(key)) {
      return NextResponse.json(
        { ok: false, error: "Unsupported storage key prefix." },
        { status: 400 }
      );
    }

    const result = await handleStorage({ ...payload, key });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, ...result.data });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to create signed URL." },
      { status: 500 }
    );
  }
}
