import { z } from "zod";
import { FormFieldType } from "@prisma/client";

const textSchema = z.string().max(50_000);

function optionsArray(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const strings = raw.filter((x): x is string => typeof x === "string");
  return strings.length ? strings : null;
}

function requireNonEmpty(base: z.ZodString, required: boolean): z.ZodType<string> {
  if (required) return base.min(1, "Required");
  return z.union([z.literal(""), base]);
}

export function parseFieldValue(
  fieldType: FormFieldType,
  raw: unknown,
  options: unknown,
  required: boolean
): string {
  const s = raw == null ? "" : String(raw).trim();
  const optList = optionsArray(options);

  if (
    !required &&
    s === "" &&
    fieldType !== FormFieldType.CHECKBOX &&
    fieldType !== FormFieldType.MULTISELECT
  ) {
    return "";
  }

  if (fieldType === FormFieldType.CHECKBOX) {
    const checked = s === "on" || s === "true" || s === "1";
    if (required && !checked) {
      throw new z.ZodError([
        { code: "custom", message: "Must be checked", path: [] },
      ]);
    }
    return checked ? "true" : "false";
  }

  if (fieldType === FormFieldType.MULTISELECT) {
    let arr: string[];
    if (Array.isArray(raw)) {
      arr = raw.map((x) => String(x).trim()).filter(Boolean);
    } else if (typeof raw === "string" && raw.startsWith("[")) {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) throw new Error("Invalid multiselect");
      arr = parsed.map((x) => String(x).trim()).filter(Boolean);
    } else {
      arr = s ? [s] : [];
    }
    if (required && arr.length === 0) {
      throw new z.ZodError([{ code: "too_small", minimum: 1, type: "array", inclusive: true, message: "Required", path: [] }]);
    }
    if (optList?.length) {
      for (const v of arr) {
        if (!optList.includes(v)) {
          throw new z.ZodError([{ code: "custom", message: `Invalid option: ${v}`, path: [] }]);
        }
      }
    }
    return JSON.stringify(arr);
  }

  if (fieldType === FormFieldType.SELECT && optList?.length) {
    const en = z.enum([optList[0], ...optList.slice(1)]);
    const sch = required ? en : z.union([z.literal(""), en]);
    return sch.parse(s);
  }

  let inner: z.ZodString;
  switch (fieldType) {
    case FormFieldType.EMAIL:
      inner = z.string().email().max(320);
      break;
    case FormFieldType.PHONE:
      inner = z.string().min(3).max(40);
      break;
    case FormFieldType.NUMBER:
      inner = z.string().regex(/^-?\d+(\.\d+)?$/, "Invalid number");
      break;
    case FormFieldType.DATE:
      inner = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
      break;
    case FormFieldType.SELECT:
      inner = textSchema;
      break;
    case FormFieldType.TEXTAREA:
    case FormFieldType.TEXT:
    default:
      inner = textSchema;
  }

  const sch = requireNonEmpty(inner, required);
  return sch.parse(s);
}

export function validateMultiselectStored(value: string, options: unknown): void {
  const optList = optionsArray(options);
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new z.ZodError([{ code: "custom", message: "Invalid multiselect value", path: [] }]);
  }
  if (!Array.isArray(parsed)) {
    throw new z.ZodError([{ code: "custom", message: "Multiselect must be an array", path: [] }]);
  }
  if (optList?.length) {
    for (const v of parsed) {
      if (typeof v !== "string" || !optList.includes(v)) {
        throw new z.ZodError([{ code: "custom", message: "Invalid option", path: [] }]);
      }
    }
  }
}

export const signDocumentBodySchema = z.object({
  signerName: z.string().min(1).max(200),
  signerEmail: z.string().email().max(320),
  consentAccepted: z.literal(true),
});

export type SignDocumentBody = z.infer<typeof signDocumentBodySchema>;
