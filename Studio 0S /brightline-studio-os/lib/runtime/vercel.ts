export function isVercelVisualOnly(): boolean {
  return !!process.env.VERCEL;
}

