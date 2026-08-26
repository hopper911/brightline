import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { SITE_BACKGROUNDS_PREFIX } from "@/lib/site-background-videos";
import { putObjectBuffer } from "@/lib/storage-r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PART_BYTES = 3.5 * 1024 * 1024;

function assertStagingKey(key: string) {
  const clean = key.replace(/^\/+/, "");
  const prefix = `${SITE_BACKGROUNDS_PREFIX}.upload-parts/`;
  if (!clean.startsWith(prefix) || clean.includes("..")) {
    throw Object.assign(new Error("Invalid staging key."), { status: 400 });
  }
  return clean;
}

/** Store one ≤3MB chunk under the staging prefix (not an R2 multipart part yet). */
export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Expected multipart form data." }, { status: 400 });
  }

  const stagingPrefix = form.get("stagingPrefix")?.toString() ?? "";
  const partNumber = Number(form.get("partNumber"));
  const chunk = form.get("chunk");

  if (!stagingPrefix || !Number.isFinite(partNumber) || partNumber < 1) {
    return NextResponse.json(
      { ok: false, error: "stagingPrefix and partNumber are required." },
      { status: 400 }
    );
  }
  if (!(chunk instanceof Blob)) {
    return NextResponse.json({ ok: false, error: "Missing chunk." }, { status: 400 });
  }
  if (chunk.size > MAX_PART_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Part too large for this endpoint." },
      { status: 413 }
    );
  }

  try {
    const prefix = assertStagingKey(
      stagingPrefix.endsWith("/") ? stagingPrefix : `${stagingPrefix}/`
    );
    const key = `${prefix}${String(Math.round(partNumber)).padStart(5, "0")}`;
    const body = Buffer.from(await chunk.arrayBuffer());
    await putObjectBuffer({
      key,
      body,
      contentType: "application/octet-stream",
      access: "private",
    });
    return NextResponse.json({ ok: true, partNumber: Math.round(partNumber), key, bytes: body.length });
  } catch (err) {
    const status =
      typeof err === "object" && err && "status" in err && typeof (err as { status: number }).status === "number"
        ? (err as { status: number }).status
        : 500;
    const message = err instanceof Error ? err.message : "Part upload failed.";
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
