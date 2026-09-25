import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { hashPassword, parsePasswordHash, verifyPassword } from "@/lib/password";

const fast = { N: 1024, r: 8, p: 1 };

describe("password hashing", () => {
  it("verifies the right password", async () => {
    const stored = await hashPassword("correct horse", fast);
    expect(await verifyPassword("correct horse", stored)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const stored = await hashPassword("correct horse", fast);
    expect(await verifyPassword("correct horsf", stored)).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("same", fast)).not.toBe(await hashPassword("same", fast));
  });

  it("never contains characters that need escaping in .env files", async () => {
    expect(await hashPassword("x", fast)).toMatch(/^scrypt:[A-Za-z0-9:_-]+$/);
  });

  it("rejects malformed or unsafe hashes", async () => {
    expect(parsePasswordHash("")).toBeNull();
    expect(parsePasswordHash("plaintext")).toBeNull();
    expect(parsePasswordHash("scrypt:1000:8:1:c2FsdHNhbHQ:aGFzaGhhc2hoYXNoaGFzaA")).toBeNull();
    expect(parsePasswordHash("scrypt:4194304:8:1:c2FsdHNhbHQ:aGFzaGhhc2hoYXNoaGFzaA")).toBeNull();
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });

  it("accepts hashes from scripts/hash-password.mjs", async () => {
    const stored = execFileSync("node", ["scripts/hash-password.mjs"], {
      input: "from the script\n",
    })
      .toString()
      .trim();
    expect(parsePasswordHash(stored)).not.toBeNull();
    expect(await verifyPassword("from the script", stored)).toBe(true);
  });
});
