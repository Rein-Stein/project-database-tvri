import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "@/lib/mysql";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import type { ChangeRequestData, JadwalChangeData, NarasumberChangeData } from "@/types";

export const dynamic = "force-dynamic";

interface ChangeRow extends RowDataPacket {
  id: string;
  entity_type: string;
  entity_id: string;
  operator_id: string;
  data_lama: ChangeRequestData;
  data_baru: ChangeRequestData;
  status: "pending" | "approved" | "rejected";
}

function session() {
  return verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);
}

function dateString(value: unknown): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? "").slice(0, 10);
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function narasumberData(value: ChangeRequestData): NarasumberChangeData | null {
  const fields = ["nama", "bidang", "instansi", "jabatan", "phone"] as const;
  if (fields.some((field) => typeof value[field] !== "string")) return null;
  return {
    nama: value.nama!,
    bidang: value.bidang!,
    instansi: value.instansi!,
    jabatan: value.jabatan!,
    phone: value.phone!,
  };
}

function jadwalData(value: ChangeRequestData): JadwalChangeData | null {
  if (typeof value.narasumberId !== "string" || typeof value.tanggal !== "string" || typeof value.program !== "string") return null;
  if (typeof value.status !== "string" || typeof value.jenisSiaran !== "string" || !isValidDate(value.tanggal)) return null;
  if (value.tanggalBaru && !isValidDate(value.tanggalBaru)) return null;
  return {
    narasumberId: value.narasumberId,
    tanggal: value.tanggal,
    waktu: value.waktu ?? "",
    program: value.program,
    jenisSiaran: value.jenisSiaran as JadwalChangeData["jenisSiaran"],
    topik: value.topik ?? "",
    catatan: value.catatan ?? "",
    status: value.status as JadwalChangeData["status"],
    tanggalBaru: value.tanggalBaru ?? "",
  };
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
      if (change.entity_type === "narasumber_create") {
        const data = narasumberData(change.data_baru);
        if (!data || !data.nama || !data.bidang || !data.instansi) {
          await connection.rollback();
          return NextResponse.json({ ok: false, message: "Data narasumber pada pengajuan tidak valid." }, { status: 409 });
        }
        const [existing] = await connection.query<RowDataPacket[]>("SELECT id FROM narasumber WHERE id = ? FOR UPDATE", [change.entity_id]);
        if (existing.length) {
          await connection.rollback();
          return NextResponse.json({ ok: false, message: "ID narasumber sudah digunakan. Pengajuan tidak dapat diterapkan." }, { status: 409 });
        }
        await connection.query(
          "INSERT INTO narasumber (id, nama, bidang, instansi, jabatan, phone, last_appearance) VALUES (?, ?, ?, ?, ?, ?, NULL)",
          [change.entity_id, data.nama, data.bidang, data.instansi, data.jabatan, data.phone]
        );
      } else if (change.entity_type === "narasumber" || change.entity_type === "narasumber_update") {
        const data = narasumberData(change.data_baru);
        const old = narasumberData(change.data_lama);
        if (!data || !old) {
          await connection.rollback();
          return NextResponse.json({ ok: false, message: "Data narasumber pada pengajuan tidak valid." }, { status: 409 });
        }
        const [result] = await connection.query<ResultSetHeader>(
          "UPDATE narasumber SET nama = ?, bidang = ?, instansi = ?, jabatan = ?, phone = ? WHERE id = ? AND nama = ? AND bidang = ? AND instansi = ? AND COALESCE(jabatan, '') = ? AND COALESCE(phone, '') = ?",
          [data.nama, data.bidang, data.instansi, data.jabatan, data.phone, change.entity_id, old.nama, old.bidang, old.instansi, old.jabatan, old.phone]
        );
        if (result.affectedRows !== 1) {
          await connection.rollback();
          return NextResponse.json({ ok: false, message: "Data utama sudah berubah. Pengajuan perlu ditinjau ulang." }, { status: 409 });
        }
      } else if (change.entity_type === "jadwal_siaran_create") {
        const data = jadwalData(change.data_baru);
        if (!data || !["dijadwalkan", "sudah-tampil", "dibatalkan", "ditunda"].includes(data.status) || !["live", "rekaman"].includes(data.jenisSiaran)) {
          await connection.rollback();
          return NextResponse.json({ ok: false, message: "Data jadwal pada pengajuan tidak valid." }, { status: 409 });
        }
        const [existing] = await connection.query<RowDataPacket[]>("SELECT id FROM jadwal_siaran WHERE id = ? FOR UPDATE", [change.entity_id]);
        if (existing.length) {
          await connection.rollback();
          return NextResponse.json({ ok: false, message: "ID jadwal sudah digunakan. Pengajuan tidak dapat diterapkan." }, { status: 409 });
        }
        await connection.query(
          "INSERT INTO jadwal_siaran (id, narasumber_id, tanggal, waktu, program, jenis_siaran, topik, catatan, status, tanggal_baru) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [change.entity_id, data.narasumberId, data.tanggal, data.waktu || null, data.program, data.jenisSiaran, data.topik || null, data.catatan || null, data.status, data.tanggalBaru || null]
        );
        if (data.status === "sudah-tampil") {
          const historyId = `jadwal-${change.entity_id}`;
          const [history] = await connection.query<RowDataPacket[]>("SELECT id FROM riwayat_siaran WHERE id = ? FOR UPDATE", [historyId]);
          if (!history.length) {
            await connection.query(
              "INSERT INTO riwayat_siaran (id, narasumber_id, tanggal, waktu, program, jenis_siaran, topik, catatan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
              [historyId, data.narasumberId, data.tanggal, data.waktu || null, data.program, data.jenisSiaran, data.topik || null, data.catatan || null]
            );
          }
          await connection.query(
            "UPDATE narasumber SET last_appearance = (SELECT MAX(tanggal) FROM riwayat_siaran WHERE narasumber_id = ?) WHERE id = ?",
            [data.narasumberId, data.narasumberId]
          );
        }
      } else if (change.entity_type === "jadwal_siaran_update") {
        const data = jadwalData(change.data_baru);
        const old = jadwalData(change.data_lama);
        if (!data || !old || !["dijadwalkan", "sudah-tampil", "dibatalkan", "ditunda"].includes(data.status) || !["live", "rekaman"].includes(data.jenisSiaran)) {
          await connection.rollback();
          return NextResponse.json({ ok: false, message: "Data jadwal pada pengajuan tidak valid." }, { status: 409 });
        }
        const [rows] = await connection.query<RowDataPacket[]>("SELECT * FROM jadwal_siaran WHERE id = ? FOR UPDATE", [change.entity_id]);
        const current = rows[0];
        const currentData: JadwalChangeData | null = current ? {
          narasumberId: current.narasumber_id,
          tanggal: dateString(current.tanggal),
          waktu: current.waktu ?? "",
          program: current.program,
          jenisSiaran: current.jenis_siaran ?? "live",
          topik: current.topik ?? "",
          catatan: current.catatan ?? "",
          status: current.status,
          tanggalBaru: current.tanggal_baru ? dateString(current.tanggal_baru) : "",
        } : null;
        if (!currentData || JSON.stringify(currentData) !== JSON.stringify(old)) {
          await connection.rollback();
          return NextResponse.json({ ok: false, message: "Data jadwal sudah berubah. Pengajuan perlu ditinjau ulang." }, { status: 409 });
        }
        await connection.query(
          "UPDATE jadwal_siaran SET narasumber_id = ?, tanggal = ?, waktu = ?, program = ?, jenis_siaran = ?, topik = ?, catatan = ?, status = ?, tanggal_baru = ? WHERE id = ?",
          [data.narasumberId, data.tanggal, data.waktu || null, data.program, data.jenisSiaran, data.topik || null, data.catatan || null, data.status, data.tanggalBaru || null, change.entity_id]
        );
        if (old.status !== "sudah-tampil" && data.status === "sudah-tampil") {
          const historyId = `jadwal-${change.entity_id}`;
          const [history] = await connection.query<RowDataPacket[]>("SELECT id FROM riwayat_siaran WHERE id = ? FOR UPDATE", [historyId]);
          if (!history.length) {
            await connection.query(
              "INSERT INTO riwayat_siaran (id, narasumber_id, tanggal, waktu, program, jenis_siaran, topik, catatan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
              [historyId, data.narasumberId, data.tanggal, data.waktu || null, data.program, data.jenisSiaran, data.topik || null, data.catatan || null]
            );
          }
          await connection.query(
            "UPDATE narasumber SET last_appearance = (SELECT MAX(tanggal) FROM riwayat_siaran WHERE narasumber_id = ?) WHERE id = ?",
            [data.narasumberId, data.narasumberId]
          );
        }
      } else {
        await connection.rollback();
        return NextResponse.json({ ok: false, message: "Jenis pengajuan tidak didukung." }, { status: 409 });
      }
    }

    const [statusResult] = await connection.query<ResultSetHeader>(
      "UPDATE change_requests SET status = ?, alasan_penolakan = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ? AND status = 'pending'",
      [action === "approve" ? "approved" : "rejected", action === "reject" ? reason : null, reviewer.userId, params.id]
    );
    if (statusResult.affectedRows !== 1) {
      await connection.rollback();
      return NextResponse.json({ ok: false, message: "Pengajuan ini sudah diproses sebelumnya." }, { status: 409 });
    }
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

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const admin = session();
  if (!admin) return NextResponse.json({ ok: false, message: "Silakan login terlebih dahulu." }, { status: 401 });
  if (admin.role !== "admin") return NextResponse.json({ ok: false, message: "Hanya Admin yang dapat menghapus riwayat pengajuan." }, { status: 403 });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<RowDataPacket[]>("SELECT status FROM change_requests WHERE id = ? FOR UPDATE", [params.id]);
    const change = rows[0];
    if (!change) {
      await connection.rollback();
      return NextResponse.json({ ok: false, message: "Riwayat pengajuan tidak ditemukan." }, { status: 404 });
    }
    if (change.status === "pending") {
      await connection.rollback();
      return NextResponse.json({ ok: false, message: "Pengajuan pending tidak dapat dihapus." }, { status: 409 });
    }
    await connection.query("DELETE FROM change_requests WHERE id = ? AND status IN ('approved', 'rejected')", [params.id]);
    await connection.query(
      "INSERT INTO log_aktivitas (id, waktu, aktor, aksi, detail) VALUES (?, NOW(), ?, ?, ?)",
      [`log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, admin.name, "Menghapus riwayat pengajuan", `Pengajuan: ${params.id}`]
    );
    await connection.commit();
    return NextResponse.json({ ok: true, message: "Riwayat pengajuan dihapus." });
  } catch (error) {
    await connection.rollback();
    console.error("Gagal menghapus riwayat pengajuan:", error);
    return NextResponse.json({ ok: false, message: "Gagal menghapus riwayat pengajuan." }, { status: 500 });
  } finally {
    connection.release();
  }
}
