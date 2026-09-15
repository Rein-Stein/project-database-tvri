import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/mysql";
import {
  createSessionToken,
  verifyPassword,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  CORE_ACCOUNT_ID,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

// Batasi percobaan login sederhana per-instance server (bukan pengganti
// rate limiting sungguhan, tapi cukup untuk menahan brute-force kasar).
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 10_000; // batasi ukuran map agar tidak tumbuh tanpa batas

function pruneExpired(now: number) {
  for (const [key, entry] of attempts) {
    if (entry.resetAt < now) attempts.delete(key);
  }
}

function tooManyAttempts(key: string): boolean {
  const now = Date.now();
  pruneExpired(now);
  if (attempts.size >= MAX_ENTRIES && !attempts.has(key)) {
    // Map penuh: buang entri terlama (urutan iterasi Map = urutan penyisipan).
    const oldest = attempts.keys().next().value;
    if (oldest !== undefined) attempts.delete(oldest);
  }
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Permintaan tidak valid." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ ok: false, message: "Email dan password wajib diisi." }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "local";
  if (tooManyAttempts(`${ip}:${email}`)) {
    return NextResponse.json(
      { ok: false, message: "Terlalu banyak percobaan gagal. Coba lagi dalam beberapa menit." },
      { status: 429 }
    );
  }

  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const adminHash = process.env.ADMIN_PASSWORD_HASH || "";
  const adminName = process.env.ADMIN_NAME || "Administrator TVRI";
  const coreEmail = (process.env.ACCOUNT_MANAGEMENT_EMAIL || "").trim().toLowerCase();
  const coreHash = process.env.ACCOUNT_MANAGEMENT_PASSWORD_HASH || "";

  let user: { userId: string; email: string; name: string; role: "admin" | "operator" } | null = null;
  let isDbUser = false; // hanya user dari tabel `users` yang punya baris untuk di-update last_login

  if (coreEmail && coreHash && email === coreEmail && verifyPassword(password, coreHash)) {
    user = { userId: CORE_ACCOUNT_ID, email: coreEmail, name: "Administrator Inti", role: "admin" };
  }

  if (!user && process.env.DB_NAME) {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = ? LIMIT 1",
        [email]
      );
      const row = (rows as RowDataPacket[])[0];
      if (row && row.is_active && verifyPassword(password, String(row.password_hash || ""))) {
        user = {
          userId: String(row.id),
          email: String(row.email),
          name: String(row.name),
          role: row.role === "admin" ? "admin" : "operator",
        };
        isDbUser = true;
      }
    } catch (error) {
      console.error("Login DB gagal:", error);
    }
  }

  if (!user && adminEmail && adminHash && email === adminEmail && verifyPassword(password, adminHash)) {
    user = { userId: "admin-env", email: adminEmail, name: adminName, role: "admin" };
  }

  if (!user) {
    return NextResponse.json({ ok: false, message: "Email atau password salah." }, { status: 401 });
  }

  const sessionUser = {
    userId: user.userId,
    email: user.email,
    name: user.name,
    role: user.role,
  };
  const token = createSessionToken(sessionUser);

  if (isDbUser && process.env.DB_NAME) {
    await pool.query("UPDATE users SET last_login = NOW() WHERE id = ?", [user!.userId]).catch((error) => {
      console.error("Gagal memperbarui last_login:", error);
    });
  }

  const response = NextResponse.json({
    ok: true,
    user: { id: user.userId, email: user.email, name: user.name, role: user.role },
  });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
