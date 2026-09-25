#!/usr/bin/env node
// On a terminal, asks for a username (default admin) and password and prints
// the AUTH_USERNAME and AUTH_PASSWORD_HASH lines for .env. Piped input prints
// only the hash: echo -n 'secret' | node scripts/hash-password.mjs
// Keep the format in sync with lib/password.ts and lib/auth-config.ts.
import { randomBytes, scrypt } from "node:crypto";

const N = 65536;
const r = 8;
const p = 2;
const DEFAULT_USERNAME = "admin";

function hash(password) {
  const salt = randomBytes(16);
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      32,
      { N, r, p, maxmem: 256 * N * r + 1024 * 1024 },
      (error, key) =>
        error
          ? reject(error)
          : resolve(
              ["scrypt", N, r, p, salt.toString("base64url"), key.toString("base64url")].join(":"),
            ),
    );
  });
}

// Input typed or pasted past the end of one answer, kept for the next prompt.
let pending = "";

function prompt(question, { echo = false } = {}) {
  return new Promise((resolve) => {
    const { stdin, stderr } = process;
    stderr.write(question);
    let value = "";
    const onData = (chunk) => {
      // Drop terminal escape sequences, like the markers some terminals
      // wrap pasted text in, so they don't end up in the password.
      const chars = [...chunk.replace(/\x1b\[[0-9;?]*[~A-Za-z]/g, "")];
      for (let i = 0; i < chars.length; i++) {
        const char = chars[i];
        if (char === "\r" || char === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          stderr.write("\n");
          pending = chars
            .slice(i + 1)
            .join("")
            .replace(/^\n/, "");
          resolve(value);
          return true;
        }
        if (char === "\u0003") {
          stderr.write("\n");
          process.exit(130);
        }
        if (char === "\u007f" || char === "\b") {
          if (echo && value) stderr.write("\b \b");
          value = value.slice(0, -1);
        } else if (char >= " ") {
          if (echo) stderr.write(char);
          value += char;
        }
      }
      return false;
    };
    const buffered = pending;
    pending = "";
    if (buffered && onData(buffered)) return;
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");
    stdin.on("data", onData);
    stdin.resume();
  });
}

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data.replace(/\r?\n$/, "");
}

let username = null;
let password;
if (process.stdin.isTTY) {
  username =
    (await prompt(`Username [${DEFAULT_USERNAME}]: `, { echo: true })).trim() ||
    DEFAULT_USERNAME;
  if (/[\s$"'#]/.test(username)) {
    console.error("Use a username without spaces, quotes, $ or #.");
    process.exit(1);
  }
  password = await prompt("Password: ");
  const again = await prompt("Again: ");
  if (password !== again) {
    console.error("Passwords don't match.");
    process.exit(1);
  }
} else {
  password = await readStdin();
}

if (password.length < 8) {
  console.error("Use at least 8 characters.");
  process.exit(1);
}

const stored = await hash(password);
if (username) {
  console.log(`AUTH_USERNAME=${username}`);
  console.log(`AUTH_PASSWORD_HASH=${stored}`);
} else {
  console.log(stored);
}
