import crypto from "crypto";
import type { UserRole } from "@/types";

/**
 * Utilitas autentikasi sisi server.
 * Sengaja hanya memakai modul bawaan Node.js (crypto) agar tidak perlu
 * menambah dependency baru (bcrypt/jsonwebtoken dsb).
 *
 * - Password di-hash dengan scrypt (salt acak per password).
 * - Sesi login berupa token bertanda tangan (HMAC-SHA256), disimpan di
 *   cookie httpOnly supaya tidak bisa dibaca/diubah lewat JavaScript
 *   di browser.
 */

const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET && process.env.NODE_ENV === "production") {
  // Jangan biarkan aplikasi jalan di production tanpa secret sungguhan.
  console.error(
    "PERINGATAN: SESSION_SECRET belum diatur di environment production. " +
      "Set nilai acak yang panjang sebelum deploy."
  );
}

const EFFECTIVE_SECRET = SESSION_SECRET || "dev-only-insecure-secret-jangan-dipakai-production";

export function isSessionSecretConfigured(): boolean {
  return Boolean(SESSION_SECRET);
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = (stored || "").split(":");
  if (!salt || !hash) return false;
  try {
    const hashBuffer = Buffer.from(hash, "hex");
    const testHash = crypto.scryptSync(password, salt, 64);
    if (hashBuffer.length !== testHash.length) return false;
    return crypto.timingSafeEqual(hashBuffer, testHash);
  } catch {
    return false;
  }
}

export interface SessionUser {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
}

interface SessionPayload extends SessionUser {
  exp: number; // unix seconds
}

function sign(data: string): string {
  return crypto.createHmac("sha256", EFFECTIVE_SECRET).update(data).digest("hex");
}

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 jam

export function createSessionToken(user: SessionUser): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload: SessionPayload = { ...user, exp };
  const json = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = sign(json);
  return `${json}.${sig}`;
}

/**
 * Memverifikasi format dan tanda tangan token "json.signature" (HMAC-SHA256).
 * Mengembalikan payload hasil parse jika valid, atau null jika token
 * rusak, tanda tangan tidak cocok, atau JSON tidak dapat dibaca.
 */
function verifySignedToken<T>(token: string | undefined | null): T | null {
  if (!token) return null;
  const [json, sig] = token.split(".");
  if (!json || !sig) return null;

  const expectedSig = sign(json);
  const sigBuffer = Buffer.from(sig, "hex");
  const expectedBuffer = Buffer.from(expectedSig, "hex");
  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  try {
    return JSON.parse(Buffer.from(json, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function verifySessionToken(token: string | undefined | null): SessionUser | null {
  const payload = verifySignedToken<SessionPayload>(token);
  if (!payload) return null;
  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
  if (payload.role !== "admin" && payload.role !== "operator") return null;
  return {
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  };
}

export const SESSION_COOKIE_NAME = "tvri_session";
export const ACCOUNT_MANAGEMENT_COOKIE_NAME = "tvri_account_management";
export { SESSION_MAX_AGE_SECONDS };

export const CORE_ACCOUNT_ID = "core-account";

export function getCoreAccountEmail(): string {
  return (process.env.ACCOUNT_MANAGEMENT_EMAIL || "").trim().toLowerCase();
}

export function isCoreAccount(idOrEmail: string): boolean {
  const value = idOrEmail.trim().toLowerCase();
  return value === CORE_ACCOUNT_ID || (!!getCoreAccountEmail() && value === getCoreAccountEmail());
}

const ACCOUNT_MANAGEMENT_MAX_AGE_SECONDS = 60 * 60 * 2;

interface AccountManagementPayload {
  scope: "account-management";
  email: string;
  exp: number;
}

export function createAccountManagementToken(email: string): string {
  const payload: AccountManagementPayload = {
    scope: "account-management",
    email,
    exp: Math.floor(Date.now() / 1000) + ACCOUNT_MANAGEMENT_MAX_AGE_SECONDS,
  };
  const json = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${json}.${sign(json)}`;
}

export function verifyAccountManagementToken(token: string | undefined | null): boolean {
  const payload = verifySignedToken<AccountManagementPayload>(token);
  if (!payload) return false;
  const configuredEmail = getCoreAccountEmail();
  return payload.scope === "account-management"
    && payload.email === configuredEmail
    && payload.exp >= Math.floor(Date.now() / 1000);
}
