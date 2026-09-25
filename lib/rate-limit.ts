type Bucket = { count: number; resetAt: number };

export type RateLimiter = ReturnType<typeof createRateLimiter>;

// Fixed-window counter. Attempts are recorded before the password is
// checked, so parallel requests can't slip past the limit.
export function createRateLimiter({
  limit,
  windowMs,
}: {
  limit: number;
  windowMs: number;
}) {
  const buckets = new Map<string, Bucket>();

  function current(key: string, now: number): Bucket | undefined {
    const bucket = buckets.get(key);
    if (bucket && bucket.resetAt <= now) {
      buckets.delete(key);
      return undefined;
    }
    return bucket;
  }

  function prune(now: number) {
    if (buckets.size < 1000) return;
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }

  return {
    // Milliseconds until the key may try again, or 0 if it may try now.
    blockedFor(key: string, now = Date.now()): number {
      const bucket = current(key, now);
      return bucket && bucket.count >= limit ? bucket.resetAt - now : 0;
    },
    record(key: string, now = Date.now()) {
      prune(now);
      const bucket = current(key, now);
      if (bucket) {
        bucket.count += 1;
      } else {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
      }
    },
    reset(key: string) {
      buckets.delete(key);
    },
  };
}
