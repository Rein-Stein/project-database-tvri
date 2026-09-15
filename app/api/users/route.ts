import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "@/lib/mysql";
import {
  hashPassword,
  verifyAccountManagementToken,
  ACCOUNT_MANAGEMENT_COOKIE_NAME,
  CORE_ACCOUNT_ID,
  getCoreAccountEmail,
  isCoreAccount,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Bentuk baris dari tabel `users` sesuai skema SELECT di route ini. */
interface UserRow extends RowDataPacket {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: number | boolean;
  created_at: Date | null;
  updated_at: Date | null;
  last_login: Date | null;
}

function ensureAdmin() {
  return verifyAccountManagementToken(cookies().get(ACCOUNT_MANAGEMENT_COOKIE_NAME)?.value);
}

export async function GET() {
  if (!ensureAdmin()) {
    return NextResponse.json({ ok: false, message: "Akses ditolak." }, { status: 403 });
  }

  let rows: UserRow[];
  try {
    [rows] = await pool.query<UserRow[]>("SELECT id, name, email, role, is_active, created_at, updated_at, last_login FROM users ORDER BY created_at DESC");
  } catch (error) {
    console.error("Gagal mengambil daftar user:", error);
    return NextResponse.json({ ok: false, error: "Database error" }, { status: 500 });
  }
  const users = rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: isCoreAccount(row.email) ? "Akun inti (terproteksi)" : row.email,
    role: row.role,
    is_active: Boolean(row.is_active),
    protected: isCoreAccount(row.email),
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_login: row.last_login,
  }));
  if (getCoreAccountEmail() && !rows.some((row) => isCoreAccount(row.email))) {
    users.unshift({
      id: CORE_ACCOUNT_ID,
      name: "Administrator Inti",
      email: "Akun inti (terproteksi)",
      role: "admin",
      is_active: true,
      protected: true,
      created_at: null,
      updated_at: null,
      last_login: null,
    });
  }
  return NextResponse.json({ ok: true, users });
}

export async function POST(request: Request) {
  if (!ensureAdmin()) {
    return NextResponse.json({ ok: false, message: "Akses ditolak." }, { status: 403 });
  }

  let body: { name?: unknown; email?: unknown; password?: unknown; role?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Permintaan tidak valid." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = body.role === "admin" || body.role === "operator" ? body.role : "operator";

  if (isCoreAccount(email)) {
    return NextResponse.json({ ok: false, message: "Email akun inti sudah digunakan dan tidak dapat dibuat ulang." }, { status: 409 });
  }

  if (!name || !email || !password) {
    return NextResponse.json({ ok: false, message: "Nama, email, password, dan role wajib diisi." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, message: "Format email tidak valid." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ ok: false, message: "Password minimal 6 karakter." }, { status: 400 });
  }

  let existing: RowDataPacket[];
  try {
    [existing] = await pool.query<RowDataPacket[]>("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
  } catch (error) {
    console.error("Gagal memeriksa email:", error);
    return NextResponse.json({ ok: false, error: "Database error" }, { status: 500 });
  }
  if (existing.length > 0) {
    return NextResponse.json({ ok: false, message: "Email sudah terdaftar." }, { status: 409 });
  }

  const userId = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const passwordHash = hashPassword(password);
  try {
    await pool.query<ResultSetHeader>(
      "INSERT INTO users (id, name, email, password_hash, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())",
      [userId, name, email, passwordHash, role]
    );
  } catch (error) {
    console.error("Gagal membuat user:", error);
    return NextResponse.json({ ok: false, error: "Database error" }, { status: 500 });
  }

  // Audit trail: catat pembuatan akun (TANPA menyimpan password/hash)
  try {
    await pool.query(
      "INSERT INTO log_aktivitas (id, waktu, aktor, aksi, detail) VALUES (?, NOW(), ?, ?, ?)",
      [
        `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        "Pengelola Manajemen Akun",
        "Membuat akun baru",
        `${name} (${email}) · role: ${role}`,
      ]
    );
  } catch {
    // Logging gagal tidak boleh menggagalkan pembuatan akun
  }

  return NextResponse.json({ ok: true, user: { id: userId, name, email, role } });
}
