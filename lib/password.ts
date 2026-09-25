import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// Stored as scrypt:N:r:p:salt:hash (base64url). No "$", so it survives
// .env files and docker compose interpolation unescaped.
// Keep in sync with scripts/hash-password.mjs.
export const DEFAULT_SCRYPT = { N: 65536, r: 8, p: 2 };
const KEY_LENGTH = 32;
const MAX_N = 2 ** 20;

type Params = typeof DEFAULT_SCRYPT;

type ParsedHash = Params & { salt: Buffer; hash: Buffer };

function derive(password: string, salt: Buffer, length: number, params: Params) {
  const options: ScryptOptions = {
    ...params,
    maxmem: 256 * params.N * params.r + 1024 * 1024,
  };
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, length, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export async function hashPassword(
  password: string,
  params: Params = DEFAULT_SCRYPT,
): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, KEY_LENGTH, params);
  return [
    "scrypt",
    params.N,
    params.r,
    params.p,
    salt.toString("base64url"),
    hash.toString("base64url"),
  ].join(":");
}

export function parsePasswordHash(stored: string): ParsedHash | null {
  const parts = stored.trim().split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;
  const [N, r, p] = parts.slice(1, 4).map(Number);
  if (![N, r, p].every(Number.isInteger)) return null;
  if (N < 2 || N > MAX_N || (N & (N - 1)) !== 0) return null;
  if (r < 1 || r > 32 || p < 1 || p > 16) return null;
  const salt = Buffer.from(parts[4], "base64url");
  const hash = Buffer.from(parts[5], "base64url");
  if (salt.length < 8 || hash.length < 16) return null;
  return { N, r, p, salt, hash };
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parsed = parsePasswordHash(stored);
  if (!parsed) return false;
  const candidate = await derive(password, parsed.salt, parsed.hash.length, parsed);
  return timingSafeEqual(candidate, parsed.hash);
}
