"use node";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
const N = 32768,
  r = 8,
  p = 3;
function derive(
  value: string,
  salt: string,
  options: { N: number; r: number; p: number },
) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(
      value,
      salt,
      64,
      { ...options, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    ),
  );
}
export function validatePassword(value: string) {
  if (value.length < 8 || value.length > 256)
    throw new Error("密码须为8–256位");
}
export async function hashPassword(value: string) {
  validatePassword(value);
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${N}$${r}$${p}$${salt}$${(await derive(value, salt, { N, r, p })).toString("hex")}`;
}
export async function verifyPassword(value: string, stored?: string) {
  if (value.length > 256) return false;
  if (stored?.startsWith("scrypt$")) {
    const parts = stored.split("$");
    if (
      parts.length !== 6 ||
      parts[1] !== String(N) ||
      parts[2] !== String(r) ||
      parts[3] !== String(p) ||
      !/^[a-f0-9]{32}$/.test(parts[4]) ||
      !/^[a-f0-9]{128}$/.test(parts[5])
    )
      return false;
    return timingSafeEqual(
      await derive(value, parts[4], { N, r, p }),
      Buffer.from(parts[5], "hex"),
    );
  }
  // Existing local accounts use Node's original scrypt parameters.
  const [salt, expected] = (stored ?? "invalid:00").split(":");
  const key = await derive(value, salt, { N: 16384, r: 8, p: 1 });
  return (
    /^[a-f0-9]{128}$/.test(expected ?? "") &&
    timingSafeEqual(key, Buffer.from(expected, "hex"))
  );
}
