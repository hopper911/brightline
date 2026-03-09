export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "127.0.0.1";
  }
  return "127.0.0.1";
}

export function isRateLimited(_ip: string): boolean {
  return false;
}
