import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { assertSameOriginAdminMutation } from "@/lib/admin-request-origin";
import {
  assertR2ManagerKeyAllowed,
  cleanR2Key,
  normalizePrefix,
} from "@/lib/admin-r2-manager";
import {
  R2_UPLOAD_CHUNK_SIZE,
  R2_MULTIPART_MIN_PART,
  r2UploadStagingPrefix,
  safeUploadFileName,
  stagingId,
} from "@/lib/admin-r2-multipart";
import { normalizeR2VaultId } from "@/lib/r2-vaults";
import { normalizeUploadContentType } from "@/lib/upload-mime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Start a staged vault-aware upload. Chunks land under tmp/r2-upload/ or site/.upload-parts/.
 */
export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const originDenied = assertSameOriginAdminMutation(req);
  if (originDenied) return originDenied;

  let body: {
    prefix?: string;
    fileName?: string;
    contentType?: string;
    bytes?: number;
    vault?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const vault = normalizeR2VaultId(body.vault);
  const prefix = normalizePrefix(body.prefix ?? "");
  const fileName = safeUploadFileName(body.fileName ?? "");
  if (!prefix || !fileName) {
    return NextResponse.json(
      { ok: false, error: "prefix and fileName are required." },
      { status: 400 }
    );
  }

  const contentType = normalizeUploadContentType(body.contentType);
  if (!contentType) {
    return NextResponse.json({ ok: false, error: "Unsupported content type." }, { status: 400 });
  }
  const key = cleanR2Key(`${prefix}${fileName}`);

  try {
    assertR2ManagerKeyAllowed(prefix, vault);
    assertR2ManagerKeyAllowed(key, vault);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Key not allowed.";
    const status =
      typeof err === "object" && err && "status" in err && typeof (err as { status: number }).status === "number"
        ? (err as { status: number }).status
        : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }

  const id = stagingId();
  const stagingPrefix = r2UploadStagingPrefix(vault, id);

  return NextResponse.json({
    ok: true,
    key,
    stagingId: id,
    stagingPrefix,
    contentType,
    partSize: R2_UPLOAD_CHUNK_SIZE,
    minMultipartPartSize: R2_MULTIPART_MIN_PART,
    bytes: typeof body.bytes === "number" ? body.bytes : null,
    vault,
  });
}
