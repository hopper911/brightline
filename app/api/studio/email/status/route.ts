import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getEmailProviderStatus } from "@/lib/integrations/emailProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const status = getEmailProviderStatus();
  const account = status.emailAddress
    ? await prisma.studioEmailAccount.findFirst({
        where: {
          emailAddress: { equals: status.emailAddress, mode: "insensitive" },
        },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          emailAddress: true,
          displayName: true,
          provider: true,
          lastSyncedAt: true,
          isActive: true,
        },
      })
    : null;

  const unreadCount = account
    ? await prisma.studioEmailThread.count({
        where: { accountId: account.id, unread: true },
      })
    : 0;

  return NextResponse.json({
    ok: true,
    status,
    account,
    unreadCount,
  });
}
