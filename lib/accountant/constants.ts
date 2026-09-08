export { ACCOUNTANT_SESSION_COOKIE } from "@/lib/accountant-cookie";

/** JWT and session duration (seconds) — align with admin cookie (~8h). */
export const ACCOUNTANT_SESSION_MAX_AGE_SEC = 60 * 60 * 8;
