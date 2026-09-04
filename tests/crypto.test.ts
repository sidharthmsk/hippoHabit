import { describe, expect, it } from "vitest";
import { keysMatch, signSession, verifySession } from "@/lib/crypto";

const secret = "test-secret-value";

describe("session tokens", () => {
  it("round-trips a signed session", async () => {
    const token = await signSession(secret, 1_700_000_000_000);
    expect(await verifySession(token, secret)).toBe(true);
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signSession(secret);
    expect(await verifySession(token, "other-secret")).toBe(false);
  });

  it("rejects a tampered token", async () => {
    const token = await signSession(secret);
    expect(await verifySession(token.slice(0, -2) + "ab", secret)).toBe(false);
  });

  it("rejects empty input", async () => {
    expect(await verifySession("", secret)).toBe(false);
  });
});

describe("keysMatch", () => {
  it("accepts the matching key", async () => {
    expect(await keysMatch("hunter2", "hunter2", secret)).toBe(true);
  });

  it("rejects a wrong key", async () => {
    expect(await keysMatch("wrong", "hunter2", secret)).toBe(false);
  });

  it("rejects when the expected key is empty", async () => {
    expect(await keysMatch("", "", secret)).toBe(false);
  });
});
