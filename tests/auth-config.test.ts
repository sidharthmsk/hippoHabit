import { describe, expect, it } from "vitest";
import { readAuthConfig } from "@/lib/auth-config";

const hash = "scrypt:1024:8:1:c2FsdHNhbHRzYWx0:aGFzaGhhc2hoYXNoaGFzaA";

describe("readAuthConfig", () => {
  it("enables password sign-in", () => {
    const config = readAuthConfig({
      AUTH_SECRET: "s",
      AUTH_USERNAME: "me",
      AUTH_PASSWORD_HASH: hash,
    });
    expect(config.password).toEqual({ username: "me", passwordHash: hash });
    expect(config.oidc).toBeNull();
    expect(config.problems).toEqual([]);
  });

  it("defaults the username to admin", () => {
    const config = readAuthConfig({ AUTH_SECRET: "s", AUTH_PASSWORD_HASH: hash });
    expect(config.password).toEqual({ username: "admin", passwordHash: hash });
    expect(config.problems).toEqual([]);
  });

  it("enables OIDC with three variables", () => {
    const config = readAuthConfig({
      AUTH_SECRET: "s",
      OIDC_ISSUER: "https://auth.example.com/application/o/habits/",
      OIDC_CLIENT_ID: "id",
      OIDC_CLIENT_SECRET: "secret",
    });
    expect(config.oidc).toMatchObject({ name: "SSO", allowedUsers: [] });
    expect(config.password).toBeNull();
    expect(config.problems).toEqual([]);
  });

  it("normalizes the OIDC allowlist", () => {
    const config = readAuthConfig({
      AUTH_SECRET: "s",
      OIDC_ISSUER: "https://auth.example.com",
      OIDC_CLIENT_ID: "id",
      OIDC_CLIENT_SECRET: "secret",
      OIDC_ALLOWED_USERS: " Me@Example.com , sid ,",
    });
    expect(config.oidc?.allowedUsers).toEqual(["me@example.com", "sid"]);
  });

  it("reports half-configured methods", () => {
    const config = readAuthConfig({
      AUTH_SECRET: "s",
      AUTH_USERNAME: "me",
      OIDC_ISSUER: "https://auth.example.com",
    });
    expect(config.password).toBeNull();
    expect(config.oidc).toBeNull();
    expect(config.problems).toHaveLength(2);
  });

  it("rejects a plaintext password in the hash variable", () => {
    const config = readAuthConfig({
      AUTH_SECRET: "s",
      AUTH_USERNAME: "me",
      AUTH_PASSWORD_HASH: "hunter2",
    });
    expect(config.password).toBeNull();
    expect(config.problems[0]).toMatch(/not a valid hash/);
  });

  it("points old deployments away from ACCESS_KEY", () => {
    const config = readAuthConfig({ AUTH_SECRET: "s", ACCESS_KEY: "old" });
    expect(config.problems[0]).toMatch(/ACCESS_KEY is no longer used/);
  });

  it("requires AUTH_SECRET", () => {
    expect(readAuthConfig({}).problems).toContain("AUTH_SECRET is not set.");
  });
});
