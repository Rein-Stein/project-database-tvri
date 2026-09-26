import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { ResultSetHeader } from "mysql2";
import pool from "@/lib/mysql";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE() {
  const session = verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ ok: false, message: "Silakan login terlebih dahulu." }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ ok: false, message: "Hanya Admin yang dapat menghapus log aktivitas." }, { status: 403 });

  try {
    const [result] = await pool.query<ResultSetHeader>("DELETE FROM log_aktivitas");
    return NextResponse.json({ ok: true, deleted: result.affectedRows, message: "Seluruh log aktivitas dihapus." });
  } catch (error) {
    console.error("Gagal menghapus seluruh log aktivitas:", error);
    return NextResponse.json({ ok: false, message: "Gagal menghapus log aktivitas." }, { status: 500 });
  }
}