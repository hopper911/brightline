#!/usr/bin/env node
/**
 * Smoke test: create (or reuse) a tiny form template + assignment, then hit public API
 * GET /api/client/forms/[token] and POST .../submit.
 *
 * Usage:
 *   cd brightline && npm run test:contract-form
 *
 * Env:
 *   DATABASE_URL — required (use production pull only on a trusted machine)
 *   CONTRACT_FORM_BASE_URL — optional, default https://brightlinephotography.com
 */
import { randomBytes } from "node:crypto";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FormFieldType,
  FormSubmissionStatus,
  FormTemplateType,
  PrismaClient,
} from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

const FORM_TITLE = "Brightline contract form smoke test";
const BASE =
  (process.env.CONTRACT_FORM_BASE_URL || "https://brightlinephotography.com").replace(/\/$/, "") ||
  "https://brightlinephotography.com";

function token() {
  return randomBytes(32).toString("base64url");
}

async function main() {
  if (!(process.env.DATABASE_URL || "").trim()) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    let tpl = await prisma.formTemplate.findFirst({
      where: { title: FORM_TITLE },
      include: { fields: true },
    });

    if (!tpl) {
      tpl = await prisma.formTemplate.create({
        data: {
          title: FORM_TITLE,
          type: FormTemplateType.OTHER,
          description: "Automated smoke test; safe to delete.",
          isActive: true,
          fields: {
            create: [
              {
                label: "Test note",
                fieldType: FormFieldType.TEXT,
                required: true,
                sortOrder: 0,
              },
            ],
          },
        },
        include: { fields: true },
      });
      console.log("Created form template:", tpl.id);
    } else {
      console.log("Reusing form template:", tpl.id);
    }

    const fieldId = tpl.fields[0]?.id;
    if (!fieldId) {
      console.error("Template has no fields.");
      process.exit(1);
    }

    const client = await prisma.studioClient.findFirst({ orderBy: { createdAt: "asc" } });
    if (!client) {
      console.error("No StudioClient rows; cannot assign form.");
      process.exit(1);
    }

    const clientToken = token();
    const submission = await prisma.formSubmission.create({
      data: {
        formTemplateId: tpl.id,
        studioClientId: client.id,
        status: FormSubmissionStatus.DRAFT,
        clientToken,
      },
    });

    console.log("Submission:", submission.id, "token:", clientToken);
    console.log("Browser:", `${BASE}/client/forms/${clientToken}`);

    const getUrl = `${BASE}/api/client/forms/${clientToken}`;
    const getRes = await fetch(getUrl);
    const getJson = await getRes.json();
    if (!getRes.ok || !getJson.ok) {
      console.error("GET form schema failed:", getRes.status, getJson);
      process.exit(1);
    }
    console.log("GET schema ok; fields:", getJson.fields?.length ?? 0);

    const postUrl = `${BASE}/api/client/forms/${clientToken}/submit`;
    const postRes = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [fieldId]: "Smoke test answer" }),
    });
    const postJson = await postRes.json();
    if (!postRes.ok || !postJson.ok) {
      console.error("POST submit failed:", postRes.status, postJson);
      process.exit(1);
    }
    console.log("POST submit ok.");

    const verify = await prisma.formSubmission.findUnique({
      where: { id: submission.id },
      select: { status: true, submittedAt: true },
    });
    console.log("DB status:", verify?.status, verify?.submittedAt?.toISOString?.() ?? verify?.submittedAt);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
