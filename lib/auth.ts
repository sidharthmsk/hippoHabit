import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  keysMatch,
  signSession,
  verifySession,
} from "./crypto";

export { SESSION_COOKIE };
const ONE_YEAR = 60 * 60 * 24 * 365;

export function getSecrets() {
  return {
    accessKey: process.env.ACCESS_KEY ?? "",
    authSecret: process.env.AUTH_SECRET ?? "",
  };
}

export async function isUnlocked(): Promise<boolean> {
  const { authSecret } = getSecrets();
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifySession(token, authSecret);
}

export async function requireUnlocked() {
  if (!(await isUnlocked())) {
    redirect("/unlock");
  }
}

export async function createSession() {
  const { authSecret } = getSecrets();
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
    secure: await cookieShouldBeSecure(),
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function unlockWithKey(key: string): Promise<boolean> {
  const { accessKey, authSecret } = getSecrets();
  if (!(await keysMatch(key, accessKey, authSecret))) {
    return false;
  }
  await createSession();
  return true;
}

async function cookieShouldBeSecure(): Promise<boolean> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  return proto.split(",")[0]?.trim() === "https";
}
