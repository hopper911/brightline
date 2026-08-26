import { NextResponse } from "next/server";
import { ACCOUNTANT_SESSION_COOKIE } from "@/lib/accountant/constants";
import {
  auditAccountantAction,
  getAccountantPortalContextFromRequest,
} from "@/lib/accountant/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await getAccountantPortalContextFromRequest(req);
  if (ctx?.kind === "accountant") {
    await auditAccountantAction({
      ctx,
      action: "accountant.logout",
      req,
    });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCOUNTANT_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
