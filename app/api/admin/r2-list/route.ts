import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import {
  isR2VaultId,
  MIROTECH_SITE_ALLOWED_PREFIXES,
  normalizeR2VaultId,
  type R2VaultId,
} from "@/lib/r2-vaults-shared";
import { listObjectsWithMeta } from "@/lib/storage-r2";

const BRIGHTLINE_ALLOWED_PREFIXES = [
  "portfolio/",
  "mirotech/",
  "portfolio-public/",
  "work/",
  "studio/",
  "site/",
  "client-galleries/",
  "acd/",
  "rea/",
  "cul/",
  "biz/",
  "tri/",
  "thumb/",
];

/** Hard cap per prefix — matches R2 tools unified browse default budget. */
const MAX_KEYS_HARD_CAP = 5000;

function isBrightlinePrefixAllowed(prefix: string): boolean {
  const normalized = prefix.replace(/^\/+/, "").toLowerCase();
  return BRIGHTLINE_ALLOWED_PREFIXES.some(
    (p) => normalized.startsWith(p) || normalized === p.replace(/\/$/, "")
  );
}

function isMirotechSitePrefixAllowed(prefix: string): boolean {
  const normalized = prefix.replace(/^\/+/, "").toLowerCase();
  return MIROTECH_SITE_ALLOWED_PREFIXES.some(
    (p) => normalized.startsWith(p) || normalized === p.replace(/\/$/, "")
  );
}

/**
 * Flat list under prefix with continuation until exhausted or maxTotal.
 */
async function listKeysPaged(options: {
  prefix: string;
  maxTotal: number;
  vault: R2VaultId;
}): Promise<{ keys: string[]; truncated: boolean }> {
  const { prefix, maxTotal, vault } = options;
  const keys: string[] = [];
  let token: string | undefined;
  let truncated = false;

  do {
    const remaining = maxTotal - keys.length;
    if (remaining <= 0) {
      truncated = true;
      break;
    }
    const page = await listObjectsWithMeta({
      prefix,
      maxKeys: Math.min(1000, remaining),
      continuationToken: token,
      vault,
    });
    for (const o of page.objects) {
      if (!o.key || o.key.endsWith("/")) continue;
      keys.push(o.key);
      if (keys.length >= maxTotal) {
        truncated = true;
        break;
      }
    }
    token = page.nextContinuationToken;
    if (keys.length >= maxTotal) break;
  } while (token);

  if (token) truncated = true;
  return { keys, truncated };
}

export const runtime = "nodejs";

export async function POST(req: Request) {
  let prefix = "";
  let vault: R2VaultId = "brightline";
  try {
    const isAdmin = await authorizeAdminRequest(req);
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    let body: { prefix?: string; maxKeys?: number; vault?: string };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }

    prefix = (body.prefix ?? "").trim();
    if (!prefix) {
      return NextResponse.json({ ok: false, error: "prefix is required." }, { status: 400 });
    }

    vault = isR2VaultId(body.vault) ? body.vault : normalizeR2VaultId(body.vault);
    const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;

    if (vault === "mirotech-site") {
      if (!isMirotechSitePrefixAllowed(normalizedPrefix)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Prefix must start with projects/, journal/, resume/, or site/ for the Mirotech site vault.",
          },
          { status: 400 }
        );
      }
    } else if (!isBrightlinePrefixAllowed(normalizedPrefix)) {
      return NextResponse.json(
        { ok: false, error: "Prefix must start with an allowed R2 folder (see /api/media/public)." },
        { status: 400 }
      );
    }

    const maxKeys = Math.min(
      typeof body.maxKeys === "number" && body.maxKeys > 0 ? body.maxKeys : 5000,
      MAX_KEYS_HARD_CAP
    );

    const { keys, truncated } = await listKeysPaged({
      prefix: normalizedPrefix,
      maxTotal: maxKeys,
      vault,
    });

    const objects = keys.map((key) => ({ key, vault }));

    return NextResponse.json({
      ok: true,
      keys: objects.map((o) => o.key),
      objects,
      vault,
      truncated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to list objects.";
    const errorName = err instanceof Error ? err.name : "unknown";
    const isHeaderError =
      typeof message === "string" &&
      (message.includes("Invalid character in header content") ||
        message.toLowerCase().includes("authorization"));
    const payload: {
      ok: false;
      error: string;
      code?: string;
      details?: Record<string, unknown>;
      timestamp?: string;
      prefix?: string;
      vault?: R2VaultId;
    } = {
      ok: false,
      error: message,
      timestamp: new Date().toISOString(),
      ...(prefix ? { prefix } : {}),
      vault,
    };
    if (isHeaderError) {
      payload.code = "R2_HEADER_ERROR";
      payload.details = {
        errorName,
        hint: "Check R2 credentials for newlines/quotes (R2_* or MIROTECH_R2_*).",
      };
    } else {
      payload.details = { errorName };
    }
    console.error("R2_LIST_ERROR", err);
    return NextResponse.json(payload, { status: 500 });
  }
}
