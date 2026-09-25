import { parsePasswordHash } from "./password";

export type PasswordLogin = { username: string; passwordHash: string };

export type OidcLogin = {
  issuer: string;
  clientId: string;
  clientSecret: string;
  name: string;
  allowedUsers: string[];
};

export type AuthConfig = {
  authSecret: string;
  appUrl: string | null;
  password: PasswordLogin | null;
  oidc: OidcLogin | null;
  problems: string[];
};

type Env = Record<string, string | undefined>;

export function readAuthConfig(env: Env = process.env): AuthConfig {
  const problems: string[] = [];
  const value = (key: string) => env[key]?.trim() ?? "";

  const authSecret = value("AUTH_SECRET");
  if (!authSecret) problems.push("AUTH_SECRET is not set.");

  let password: PasswordLogin | null = null;
  const username = value("AUTH_USERNAME");
  const passwordHash = value("AUTH_PASSWORD_HASH");
  if (username || passwordHash) {
    if (!username) {
      problems.push("AUTH_PASSWORD_HASH is set but AUTH_USERNAME is not.");
    } else if (!passwordHash) {
      problems.push("AUTH_USERNAME is set but AUTH_PASSWORD_HASH is not.");
    } else if (!parsePasswordHash(passwordHash)) {
      problems.push(
        "AUTH_PASSWORD_HASH is not a valid hash. Generate one with npm run hash-password.",
      );
    } else {
      password = { username, passwordHash };
    }
  }

  let oidc: OidcLogin | null = null;
  const issuer = value("OIDC_ISSUER");
  const clientId = value("OIDC_CLIENT_ID");
  const clientSecret = value("OIDC_CLIENT_SECRET");
  if (issuer || clientId || clientSecret) {
    const missing = [
      ["OIDC_ISSUER", issuer],
      ["OIDC_CLIENT_ID", clientId],
      ["OIDC_CLIENT_SECRET", clientSecret],
    ]
      .filter(([, v]) => !v)
      .map(([k]) => k);
    if (missing.length > 0) {
      problems.push(`OIDC is partly configured. Missing: ${missing.join(", ")}.`);
    } else if (!isHttpUrl(issuer)) {
      problems.push("OIDC_ISSUER must be an http(s) URL.");
    } else {
      oidc = {
        issuer,
        clientId,
        clientSecret,
        name: value("OIDC_PROVIDER_NAME") || "SSO",
        allowedUsers: value("OIDC_ALLOWED_USERS")
          .split(",")
          .map((entry) => entry.trim().toLowerCase())
          .filter(Boolean),
      };
    }
  }

  const appUrl = value("APP_URL").replace(/\/+$/, "") || null;
  if (appUrl && !isHttpUrl(appUrl)) {
    problems.push("APP_URL must be an http(s) URL.");
  }

  if (!password && !oidc && problems.length === 0) {
    problems.push(
      value("ACCESS_KEY")
        ? "ACCESS_KEY is no longer used. Set AUTH_USERNAME and AUTH_PASSWORD_HASH, or configure OIDC."
        : "No sign-in method is configured. Set AUTH_USERNAME and AUTH_PASSWORD_HASH, or configure OIDC.",
    );
  }

  return { authSecret, appUrl, password, oidc, problems };
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
