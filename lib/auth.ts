import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { readAuthConfig } from "./auth-config";
import {
  SESSION_COOKIE,
  keysMatch,
  signSession,
  verifySession,
} from "./crypto";
import { verifyPassword } from "./password";
import { createRateLimiter, type RateLimiter } from "./rate-limit";

export { SESSION_COOKIE };
const ONE_YEAR = 60 * 60 * 24 * 365;
const FIFTEEN_MINUTES = 15 * 60 * 1000;

declare global {
  var __loginLimits: { perIp: RateLimiter; global: RateLimiter } | undefined;
}

// In memory: a restart clears it, which is fine for one self-hosted user.
function loginLimits() {
  globalThis.__loginLimits ??= {
    perIp: createRateLimiter({ limit: 5, windowMs: FIFTEEN_MINUTES }),
    global: createRateLimiter({ limit: 30, windowMs: FIFTEEN_MINUTES }),
  };
  return globalThis.__loginLimits;
}

export async function isUnlocked(): Promise<boolean> {
  const { authSecret } = readAuthConfig();
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifySession(token, authSecret);
}

export async function requireUnlocked() {
  if (!(await isUnlocked())) {
    redirect("/login");
  }
}

export async function createSession() {
  const { authSecret } = readAuthConfig();
  if (!authSecret) {
    throw new Error("AUTH_SECRET is not set");
  }
  const token = await signSession(authSecret);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
    secure: await isHttps(),
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function loginWithPassword(
  username: string,
  password: string,
): Promise<{ error?: string }> {
  const { password: login, authSecret } = readAuthConfig();
  if (!login || !authSecret) {
    return { error: "Password sign-in is not configured." };
  }

  const limits = loginLimits();
  const ip = await clientIp();
  const wait = Math.max(limits.perIp.blockedFor(ip), limits.global.blockedFor("*"));
  if (wait > 0) {
    const minutes = Math.ceil(wait / 60_000);
    return {
      error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }
  limits.perIp.record(ip);
  limits.global.record("*");

  // Always run the hash so a wrong username takes as long as a wrong password.
  const passwordOk = await verifyPassword(password, login.passwordHash);
  const usernameOk = await keysMatch(username, login.username, authSecret);
  if (!passwordOk || !usernameOk) {
    return { error: "Wrong username or password." };
  }

  limits.perIp.reset(ip);
  await createSession();
  return {};
}

async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip")?.trim() || "unknown";
}

export async function isHttps(): Promise<boolean> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  return proto.split(",")[0]?.trim() === "https";
}
