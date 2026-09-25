import { describe, expect, it } from "vitest";
import { createRateLimiter } from "@/lib/rate-limit";

describe("rate limiter", () => {
  it("blocks after the limit until the window ends", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 1000 });
    for (let i = 0; i < 3; i++) {
      expect(limiter.blockedFor("ip", 0)).toBe(0);
      limiter.record("ip", 0);
    }
    expect(limiter.blockedFor("ip", 400)).toBe(600);
    expect(limiter.blockedFor("ip", 1000)).toBe(0);
  });

  it("tracks keys separately", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    limiter.record("a", 0);
    expect(limiter.blockedFor("a", 0)).toBeGreaterThan(0);
    expect(limiter.blockedFor("b", 0)).toBe(0);
  });

  it("clears a key on reset", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    limiter.record("a", 0);
    limiter.reset("a");
    expect(limiter.blockedFor("a", 0)).toBe(0);
  });
});
