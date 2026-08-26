import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { rejectCrossSiteMutation } from "@/lib/admin-request-origin";
import { IMAGE_PORT_TEMP_PREFIX, isImagePortTempKey } from "@/lib/image-port/encode-webp";
import { putObjectBuffer } from "@/lib/storage-r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PART_BYTES = 3.5 * 1024 * 1024;
const PARTS_PREFIX = `${IMAGE_PORT_TEMP_PREFIX}.parts/`;

function assertStagingPrefix(prefix: string): string {
  const clean = prefix.trim().replace(/^\/+/, "");
  const withSlash = clean.endsWith("/") ? clean : `${clean}/`;
  if (!isImagePortTempKey(withSlash) || !withSlash.startsWith(PARTS_PREFIX)) {
    throw Object.assign(new Error("Invalid staging prefix."), { status: 400 });
  }
  return withSlash;
}

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const csrf = rejectCrossSiteMutation(req);
  if (csrf) return csrf;

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
    const prefix = assertStagingPrefix(stagingPrefix);
    const key = `${prefix}${String(Math.round(partNumber)).padStart(5, "0")}`;
    const body = Buffer.from(await chunk.arrayBuffer());
    await putObjectBuffer({
      key,
      body,
      contentType: "application/octet-stream",
      access: "private",
    });
    return NextResponse.json({
      ok: true,
      partNumber: Math.round(partNumber),
      key,
      bytes: body.length,
    });
  } catch (err) {
    const status =
      typeof err === "object" && err && "status" in err && typeof (err as { status: number }).status === "number"
        ? (err as { status: number }).status
        : 500;
    const message = err instanceof Error ? err.message : "Part upload failed.";
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
