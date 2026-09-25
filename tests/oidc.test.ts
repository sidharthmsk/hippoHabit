import { describe, expect, it } from "vitest";
import { isAllowedUser, publicOrigin } from "@/lib/oidc";

describe("isAllowedUser", () => {
  const claims = {
    sub: "abc-123",
    preferred_username: "Sid",
    email: "Sid@Example.com",
    email_verified: true,
  };

  it("lets everyone in when the allowlist is empty", () => {
    expect(isAllowedUser(claims, [])).toBe(true);
  });

  it("matches subject, username, or email case-insensitively", () => {
    expect(isAllowedUser(claims, ["abc-123"])).toBe(true);
    expect(isAllowedUser(claims, ["sid"])).toBe(true);
    expect(isAllowedUser(claims, ["sid@example.com"])).toBe(true);
    expect(isAllowedUser(claims, ["someone@else.com"])).toBe(false);
  });

  it("ignores unverified emails", () => {
    expect(
      isAllowedUser({ ...claims, email_verified: false }, ["sid@example.com"]),
    ).toBe(false);
  });
});

describe("publicOrigin", () => {
  it("prefers APP_URL", () => {
    expect(
      publicOrigin("https://habits.example.com/", new Headers(), "http://0.0.0.0:3000/x"),
    ).toBe("https://habits.example.com");
  });

  it("uses forwarded headers from the reverse proxy", () => {
    const headers = new Headers({
      "x-forwarded-host": "habits.example.com",
      "x-forwarded-proto": "https",
      host: "127.0.0.1:3000",
    });
    expect(publicOrigin(null, headers, "http://127.0.0.1:3000/x")).toBe(
      "https://habits.example.com",
    );
  });

  it("falls back to the Host header", () => {
    const headers = new Headers({ host: "localhost:3000" });
    expect(publicOrigin(null, headers, "http://localhost:3000/x")).toBe(
      "http://localhost:3000",
    );
  });
});
