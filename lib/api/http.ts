import { NextResponse } from "next/server";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

/** Standard JSON success envelope for Studio OS APIs. */
export function jsonOk<T extends Record<string, unknown>>(body: T, init?: { status?: number }) {
  return NextResponse.json(
    { ok: true, ...body },
    { status: init?.status ?? 200, headers: NO_STORE }
  );
}

/** Standard JSON error envelope. */
export function jsonErr(error: string, status: number, extras?: { code?: string }) {
  return NextResponse.json(
    { ok: false, error, ...(extras?.code ? { code: extras.code } : {}) },
    { status, headers: NO_STORE }
  );
}

export async function parseJsonBody(
  req: Request
): Promise<{ ok: true; value: unknown } | { ok: false; response: NextResponse }> {
  try {
    return { ok: true, value: await req.json() };
  } catch {
    return { ok: false, response: jsonErr("Invalid JSON body.", 400) };
  }
}
