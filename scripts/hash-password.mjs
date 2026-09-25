#!/usr/bin/env node
// Prints an AUTH_PASSWORD_HASH value. Prompts for the password on a
// terminal, or reads it from stdin: echo -n 'secret' | node scripts/hash-password.mjs
// Keep the format in sync with lib/password.ts.
import { randomBytes, scrypt } from "node:crypto";

const N = 65536;
const r = 8;
const p = 2;

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

function prompt(question) {
  return new Promise((resolve) => {
    const { stdin, stderr } = process;
    stderr.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          stderr.write("\n");
          resolve(value);
          return;
        }
        if (char === "\u0003") {
          stderr.write("\n");
          process.exit(130);
        }
        if (char === "\u007f" || char === "\b") {
          value = value.slice(0, -1);
        } else {
          value += char;
        }
      }
    };
    stdin.on("data", onData);
  });
}

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data.replace(/\r?\n$/, "");
}

let password;
if (process.stdin.isTTY) {
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

console.log(await hash(password));
