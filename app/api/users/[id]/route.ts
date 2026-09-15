import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "@/lib/mysql";
import { verifyAccountManagementToken, ACCOUNT_MANAGEMENT_COOKIE_NAME, isCoreAccount } from "@/lib/auth";

export const dynamic = "force-dynamic";

function requireAdminSession() {
  return verifyAccountManagementToken(cookies().get(ACCOUNT_MANAGEMENT_COOKIE_NAME)?.value);
}

/** Pastikan selalu ada minimal 1 admin aktif (mencegah sistem terkunci) */
async function lastActiveAdminGuard(targetId: string, excludeId?: string): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM users WHERE role = 'admin' AND is_active = 1 AND id <> ?",
    [excludeId ?? ""]
  );
  if ((rows as RowDataPacket[]).length > 0) return true;
  // Tidak ada admin aktif lain — boleh lanjut hanya jika target BUKAN admin aktif tsb
  const [target] = await pool.query<RowDataPacket[]>(
    "SELECT role, is_active FROM users WHERE id = ? LIMIT 1",
    [targetId]
  );
  const t = (target as RowDataPacket[])[0];
  return !(t && t.role === "admin" && t.is_active);
}

async function writeLog(aktor: string, aksi: string, detail: string) {
  try {
    await pool.query(
      "INSERT INTO log_aktivitas (id, waktu, aktor, aksi, detail) VALUES (?, NOW(), ?, ?, ?)",
      [`log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, aktor, aksi, detail]
    );
  } catch {
    // Logging gagal tidak boleh menggagalkan operasi utama
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = requireAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Akses ditolak." }, { status: 403 });
  }

  const [rows] = await pool.query<RowDataPacket[]>("SELECT id, name, email, role, is_active, created_at, updated_at, last_login FROM users WHERE id = ? LIMIT 1", [params.id]);
  const row = (rows as RowDataPacket[])[0];
  if (!row) {
    return NextResponse.json({ ok: false, message: "User tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, user: { id: row.id, name: row.name, email: row.email, role: row.role, is_active: Boolean(row.is_active) } });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = requireAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Akses ditolak." }, { status: 403 });
  }
  if (isCoreAccount(params.id)) {
    return NextResponse.json({ ok: false, message: "Akun inti tidak dapat diubah." }, { status: 403 });
  }

  let body: { name?: unknown; email?: unknown; role?: unknown; is_active?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Permintaan tidak valid." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body.role === "admin" || body.role === "operator" ? body.role : null;
  const isActive = typeof body.is_active === "boolean" ? body.is_active : undefined;

  // Admin tidak boleh menonaktifkan/menurunkan rolenya sendiri
  const [targetRows] = await pool.query<RowDataPacket[]>(
    "SELECT id, name, email, role, is_active FROM users WHERE id = ? LIMIT 1",
    [params.id]
  );
  const target = (targetRows as RowDataPacket[])[0];
  if (!target) {
    return NextResponse.json({ ok: false, message: "User tidak ditemukan." }, { status: 404 });
  }
  if (isCoreAccount(String(target.id)) || isCoreAccount(String(target.email))) {
    return NextResponse.json({ ok: false, message: "Akun inti tidak dapat diubah." }, { status: 403 });
  }

  if ((isActive === false || (role && role !== "admin")) && target.role === "admin" && target.is_active) {
    const allowed = await lastActiveAdminGuard(params.id);
    if (!allowed) {
      return NextResponse.json({ ok: false, message: "Minimal harus ada satu admin aktif." }, { status: 400 });
    }
  }

  const changes: string[] = [];
  if (name && name !== target.name) {
    await pool.query("UPDATE users SET name = ? WHERE id = ?", [name, params.id]);
    changes.push("nama");
  }
  if (email && email !== target.email) {
    const [dup] = await pool.query<RowDataPacket[]>("SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1", [email, params.id]);
    if ((dup as RowDataPacket[]).length > 0) {
      return NextResponse.json({ ok: false, message: "Email sudah digunakan akun lain." }, { status: 409 });
    }
    await pool.query("UPDATE users SET email = ? WHERE id = ?", [email, params.id]);
    changes.push("email");
  }
  if (role && role !== target.role) {
    await pool.query("UPDATE users SET role = ? WHERE id = ?", [role, params.id]);
    changes.push(`role: ${String(target.role)} → ${role}`);
  }
  if (typeof isActive === "boolean" && isActive !== Boolean(target.is_active)) {
    await pool.query("UPDATE users SET is_active = ? WHERE id = ?", [isActive ? 1 : 0, params.id]);
    changes.push(isActive ? "diaktifkan" : "dinonaktifkan");
  }

  if (changes.length > 0) {
    await writeLog(
      "Pengelola Manajemen Akun",
      "Mengubah akun pengguna",
      `${String(target.name)} (${String(target.email)}) · ${changes.join(", ")}`
    );
  }

  const [rows] = await pool.query<RowDataPacket[]>("SELECT id, name, email, role, is_active FROM users WHERE id = ? LIMIT 1", [params.id]);
  const row = (rows as RowDataPacket[])[0];
  return NextResponse.json({ ok: true, user: row ? { id: row.id, name: row.name, email: row.email, role: row.role, is_active: Boolean(row.is_active) } : null });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = requireAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Akses ditolak." }, { status: 403 });
  }
  if (isCoreAccount(params.id)) {
    return NextResponse.json({ ok: false, message: "Akun inti tidak dapat dihapus." }, { status: 403 });
  }

  // Admin tidak boleh menghapus akunnya sendiri
  const [targetRows] = await pool.query<RowDataPacket[]>(
    "SELECT id, name, email, role, is_active FROM users WHERE id = ? LIMIT 1",
    [params.id]
  );
  const target = (targetRows as RowDataPacket[])[0];
  if (!target) {
    return NextResponse.json({ ok: false, message: "User tidak ditemukan." }, { status: 404 });
  }
  if (isCoreAccount(String(target.id)) || isCoreAccount(String(target.email))) {
    return NextResponse.json({ ok: false, message: "Akun inti tidak dapat dihapus." }, { status: 403 });
  }

  if (target.role === "admin" && target.is_active) {
    const allowed = await lastActiveAdminGuard(params.id);
    if (!allowed) {
      return NextResponse.json({ ok: false, message: "Minimal harus ada satu admin aktif." }, { status: 400 });
    }
  }

  await pool.query<ResultSetHeader>("DELETE FROM users WHERE id = ?", [params.id]);
  await writeLog(
    "Pengelola Manajemen Akun",
    "Menghapus akun pengguna",
    `${String(target.name)} (${String(target.email)}) · role: ${String(target.role)}`
  );
  return NextResponse.json({ ok: true, deleted: true });
}
