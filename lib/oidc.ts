import * as client from "openid-client";
import type { OidcLogin } from "./auth-config";
import { signValue, unsignValue } from "./crypto";

export const OIDC_FLOW_COOKIE = "habit_oidc";
export const OIDC_CALLBACK_PATH = "/auth/oidc/callback";
export const OIDC_FLOW_MAX_AGE = 10 * 60;

type Flow = {
  state: string;
  nonce: string;
  verifier: string;
  redirectUri: string;
  expiresAt: number;
};

declare global {
  var __oidcClient:
    | { key: string; config: Promise<client.Configuration> }
    | undefined;
}

// Discovery is cached per process; a failed lookup is dropped so the next
// sign-in retries instead of caching the error.
function clientConfig(oidc: OidcLogin): Promise<client.Configuration> {
  const key = `${oidc.issuer}\n${oidc.clientId}\n${oidc.clientSecret}`;
  if (globalThis.__oidcClient?.key !== key) {
    const config = discover(oidc);
    globalThis.__oidcClient = { key, config };
    config.catch(() => {
      if (globalThis.__oidcClient?.config === config) {
        globalThis.__oidcClient = undefined;
      }
    });
  }
  return globalThis.__oidcClient.config;
}

async function discover(oidc: OidcLogin) {
  const execute = oidc.issuer.startsWith("http:")
    ? [client.allowInsecureRequests]
    : [];
  const config = await client.discovery(
    new URL(oidc.issuer),
    oidc.clientId,
    undefined,
    client.ClientSecretBasic(oidc.clientSecret),
    { execute },
  );
  // Most providers take client_secret_basic; fall back to post only when the
  // provider says it's the one it supports.
  const methods = config.serverMetadata().token_endpoint_auth_methods_supported;
  if (
    methods &&
    !methods.includes("client_secret_basic") &&
    methods.includes("client_secret_post")
  ) {
    const post = new client.Configuration(
      config.serverMetadata(),
      oidc.clientId,
      undefined,
      client.ClientSecretPost(oidc.clientSecret),
    );
    for (const extension of execute) extension(post);
    return post;
  }
  return config;
}

export async function beginOidcLogin(
  oidc: OidcLogin,
  origin: string,
  secret: string,
): Promise<{ authorizationUrl: URL; flowCookie: string }> {
  const config = await clientConfig(oidc);
  const flow: Flow = {
    state: client.randomState(),
    nonce: client.randomNonce(),
    verifier: client.randomPKCECodeVerifier(),
    redirectUri: `${origin}${OIDC_CALLBACK_PATH}`,
    expiresAt: Date.now() + OIDC_FLOW_MAX_AGE * 1000,
  };
  const authorizationUrl = client.buildAuthorizationUrl(config, {
    redirect_uri: flow.redirectUri,
    scope: "openid profile email",
    response_type: "code",
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: await client.calculatePKCECodeChallenge(flow.verifier),
    code_challenge_method: "S256",
  });
  const encoded = Buffer.from(JSON.stringify(flow)).toString("base64url");
  return { authorizationUrl, flowCookie: await signValue(encoded, secret) };
}

export type OidcResult =
  | { ok: true }
  | { ok: false; reason: "expired" | "denied" | "failed" };

export async function completeOidcLogin(
  oidc: OidcLogin,
  search: string,
  flowCookie: string | undefined,
  secret: string,
): Promise<OidcResult> {
  const flow = await readFlow(flowCookie, secret);
  if (!flow) return { ok: false, reason: "expired" };

  let claims: client.IDToken | undefined;
  try {
    const config = await clientConfig(oidc);
    const callbackUrl = new URL(flow.redirectUri);
    callbackUrl.search = search;
    const tokens = await client.authorizationCodeGrant(config, callbackUrl, {
      pkceCodeVerifier: flow.verifier,
      expectedState: flow.state,
      expectedNonce: flow.nonce,
      idTokenExpected: true,
    });
    claims = tokens.claims();
  } catch (error) {
    console.error("OIDC sign-in failed:", error);
    return { ok: false, reason: "failed" };
  }

  if (!claims || !isAllowedUser(claims, oidc.allowedUsers)) {
    console.warn(`OIDC sign-in refused for subject ${claims?.sub ?? "unknown"}`);
    return { ok: false, reason: "denied" };
  }
  return { ok: true };
}

async function readFlow(
  cookie: string | undefined,
  secret: string,
): Promise<Flow | null> {
  if (!cookie) return null;
  const encoded = await unsignValue(cookie, secret);
  if (!encoded) return null;
  try {
    const flow = JSON.parse(Buffer.from(encoded, "base64url").toString()) as Flow;
    return flow.expiresAt > Date.now() ? flow : null;
  } catch {
    return null;
  }
}

// An empty allowlist lets in anyone the provider authenticates for this
// client. Entries match the subject, username, or a verified email.
export function isAllowedUser(
  claims: Record<string, unknown>,
  allowed: string[],
): boolean {
  if (allowed.length === 0) return true;
  const candidates: string[] = [];
  if (typeof claims.sub === "string") candidates.push(claims.sub);
  if (typeof claims.preferred_username === "string") {
    candidates.push(claims.preferred_username);
  }
  if (typeof claims.email === "string" && claims.email_verified !== false) {
    candidates.push(claims.email);
  }
  return candidates.some((value) => allowed.includes(value.toLowerCase()));
}

export function publicOrigin(
  appUrl: string | null,
  headers: Headers,
  fallback: string,
): string {
  if (appUrl) return new URL(appUrl).origin;
  const host =
    headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    headers.get("host");
  if (!host) return new URL(fallback).origin;
  const proto =
    headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    new URL(fallback).protocol.replace(":", "");
  return `${proto}://${host}`;
}
