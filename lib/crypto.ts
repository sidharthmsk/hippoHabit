export const SESSION_COOKIE = "habit_session";

const encoder = new TextEncoder();

export async function hmacHex(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bufferToHex(sig);
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export async function keysMatch(
  submitted: string,
  expected: string,
  secret: string,
): Promise<boolean> {
  if (!expected || !secret) return false;
  const a = await hmacHex(submitted, secret);
  const b = await hmacHex(expected, secret);
  return timingSafeEqual(a, b);
}

const TOKEN_VERSION = "v1";

export async function signSession(
  secret: string,
  issuedAt = Date.now(),
): Promise<string> {
  const payload = `${TOKEN_VERSION}.${issuedAt}`;
  const sig = await hmacHex(payload, secret);
  return `${payload}.${sig}`;
}

export async function verifySession(
  token: string,
  secret: string,
): Promise<boolean> {
  if (!token || !secret) return false;
  const lastDot = token.lastIndexOf(".");
  if (lastDot < 0) return false;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  const [version, issuedAt] = payload.split(".");
  if (version !== TOKEN_VERSION || !issuedAt) return false;
  const expected = await hmacHex(payload, secret);
  return timingSafeEqual(sig, expected);
}

// The "value:" prefix keeps these signatures distinct from session tokens.
export async function signValue(value: string, secret: string): Promise<string> {
  return `${value}.${await hmacHex(`value:${value}`, secret)}`;
}

export async function unsignValue(
  token: string,
  secret: string,
): Promise<string | null> {
  if (!token || !secret) return null;
  const lastDot = token.lastIndexOf(".");
  if (lastDot < 0) return null;
  const value = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  const expected = await hmacHex(`value:${value}`, secret);
  return timingSafeEqual(sig, expected) ? value : null;
}

function bufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
