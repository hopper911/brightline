import { randomBytes } from "node:crypto";
import { CORRELATION_HEADER } from "@/lib/observability/types";

export { CORRELATION_HEADER };

export function newCorrelationId(): string {
  return randomBytes(16).toString("hex");
}

export function correlationIdFromRequest(req: Request): string {
  const fromHeader = req.headers.get(CORRELATION_HEADER)?.trim();
  if (fromHeader && fromHeader.length >= 8 && fromHeader.length <= 128) {
    return fromHeader;
  }
  return newCorrelationId();
}
