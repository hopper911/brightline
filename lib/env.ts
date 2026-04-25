/**
 * Assert required server env is present. No-op if not used for storage;
 * can throw if you need to require specific vars before running routes.
 */
export function assertServerEnv(): void {
  // Optional: throw if critical env missing, e.g. R2 for /api/storage
  // For now no-op so routes compile and fail at runtime with clear errors
}
