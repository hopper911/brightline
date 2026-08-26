import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import {
  assertR2UploadStagingPrefix,
  R2_UPLOAD_MAX_PART_BYTES,
} from "@/lib/admin-r2-multipart";
import { normalizeR2VaultId } from "@/lib/r2-vaults";
import { putObjectBuffer } from "@/lib/storage-r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Store one ≤3.5MB chunk under the vault staging prefix. */
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
  const vault = normalizeR2VaultId(form.get("vault")?.toString());

  if (!stagingPrefix || !Number.isFinite(partNumber) || partNumber < 1) {
    return NextResponse.json(
      { ok: false, error: "stagingPrefix and partNumber are required." },
      { status: 400 }
    );
  }
  if (!(chunk instanceof Blob)) {
    return NextResponse.json({ ok: false, error: "Missing chunk." }, { status: 400 });
  }
  if (chunk.size > R2_UPLOAD_MAX_PART_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Part too large for this endpoint." },
      { status: 413 }
    );
  }

  try {
    const prefix = assertR2UploadStagingPrefix(
      stagingPrefix.endsWith("/") ? stagingPrefix : `${stagingPrefix}/`,
      vault
    );
    const key = `${prefix}${String(Math.round(partNumber)).padStart(5, "0")}`;
    const body = Buffer.from(await chunk.arrayBuffer());
    await putObjectBuffer({
      key,
      body,
      contentType: "application/octet-stream",
      access: "private",
      vault,
    });
    return NextResponse.json({
      ok: true,
      partNumber: Math.round(partNumber),
      key,
      bytes: body.length,
      vault,
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
