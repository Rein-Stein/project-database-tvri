import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "@/lib/mysql";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface ChangeRow extends RowDataPacket {
  id: string;
  entity_type: string;
  entity_id: string;
  operator_id: string;
  data_lama: Record<string, string>;
  data_baru: Record<string, string>;
  status: "pending" | "approved" | "rejected";
}

function session() {
  return verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const reviewer = session();
  if (!reviewer) return NextResponse.json({ ok: false, message: "Silakan login terlebih dahulu." }, { status: 401 });
  if (reviewer.role !== "admin") return NextResponse.json({ ok: false, message: "Hanya Admin yang dapat memproses pengajuan." }, { status: 403 });

  let body: { action?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Permintaan tidak valid." }, { status: 400 });
  }
  const action = body.action === "approve" || body.action === "reject" ? body.action : null;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!action) return NextResponse.json({ ok: false, message: "Aksi tidak valid." }, { status: 400 });
  if (action === "reject" && !reason) return NextResponse.json({ ok: false, message: "Alasan penolakan wajib diisi." }, { status: 400 });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<ChangeRow[]>("SELECT * FROM change_requests WHERE id = ? FOR UPDATE", [params.id]);
    const change = rows[0];
    if (!change) {
      await connection.rollback();
      return NextResponse.json({ ok: false, message: "Pengajuan tidak ditemukan." }, { status: 404 });
    }
    if (change.status !== "pending") {
      await connection.rollback();
      return NextResponse.json({ ok: false, message: "Pengajuan ini sudah diproses sebelumnya." }, { status: 409 });
    }
    if (change.operator_id === reviewer.userId) {
      await connection.rollback();
      return NextResponse.json({ ok: false, message: "Admin tidak dapat menyetujui pengajuan miliknya sendiri." }, { status: 403 });
    }

    if (action === "approve") {
      const data = change.data_baru;
      const [result] = await connection.query<ResultSetHeader>(
        "UPDATE narasumber SET nama = ?, bidang = ?, instansi = ?, jabatan = ?, phone = ? WHERE id = ? AND nama = ? AND bidang = ? AND instansi = ? AND COALESCE(jabatan, '') = ? AND COALESCE(phone, '') = ?",
        [data.nama, data.bidang, data.instansi, data.jabatan, data.phone, change.entity_id, change.data_lama.nama, change.data_lama.bidang, change.data_lama.instansi, change.data_lama.jabatan, change.data_lama.phone]
      );
      if (result.affectedRows !== 1) {
        await connection.rollback();
        return NextResponse.json({ ok: false, message: "Data utama sudah berubah. Pengajuan perlu ditinjau ulang." }, { status: 409 });
      }
    }

    await connection.query(
      "UPDATE change_requests SET status = ?, alasan_penolakan = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ? AND status = 'pending'",
      [action === "approve" ? "approved" : "rejected", action === "reject" ? reason : null, reviewer.userId, params.id]
    );
    await connection.query(
      "INSERT INTO log_aktivitas (id, waktu, aktor, aksi, detail) VALUES (?, NOW(), ?, ?, ?)",
      [`log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, reviewer.name, action === "approve" ? "Menyetujui pengajuan perubahan" : "Menolak pengajuan perubahan", `Pengajuan: ${params.id}${reason ? ` · Alasan: ${reason}` : ""}`]
    );
    await connection.commit();
    return NextResponse.json({ ok: true, message: action === "approve" ? "Perubahan disetujui dan diterapkan." : "Pengajuan ditolak." });
  } catch (error) {
    await connection.rollback();
    console.error("Gagal memproses pengajuan perubahan:", error);
    return NextResponse.json({ ok: false, message: "Gagal memproses pengajuan perubahan." }, { status: 500 });
  } finally {
    connection.release();
  }
}
