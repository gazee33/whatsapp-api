interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const WINDOW_MS = 60 * 1000; // 60-second fixed window (resets fully when expired)

// Exported so tests can inspect / reset it
export const businessRateLimitMap = new Map<string, RateLimitEntry>();

// Prune stale windows every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [key, entry] of businessRateLimitMap) {
    if (entry.windowStart < cutoff) {
      businessRateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check whether businessId has exceeded its per-minute message rate.
 *
 * @param businessId   The tenant's DB id
 * @param limitPerMin  messagesPerMinute from the Business row (default 30)
 * @returns true if the request should be allowed, false if it should be rate-limited
 */
export function checkBusinessRateLimit(businessId: string, limitPerMin: number = 30): boolean {
  const now = Date.now();
  const entry = businessRateLimitMap.get(businessId);

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    // Start a fresh window
    businessRateLimitMap.set(businessId, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= limitPerMin) {
    return false;
  }

  entry.count += 1;
  return true;
}
