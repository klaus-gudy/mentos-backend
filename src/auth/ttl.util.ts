/**
 * Parses a TTL string ("900s", "15m", "7d") into seconds.
 *
 * Shared so the value signed into the token and the `expiresIn` reported to the
 * client are derived from the same config string and cannot drift.
 */
export function parseTtlSeconds(ttl: string | undefined, fallbackSeconds = 900): number {
  const match = /^(\d+)\s*([smhd])?$/.exec((ttl ?? '').trim());
  if (!match) {
    return fallbackSeconds;
  }
  const factor: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return parseInt(match[1], 10) * (factor[match[2] ?? 's'] ?? 1);
}
