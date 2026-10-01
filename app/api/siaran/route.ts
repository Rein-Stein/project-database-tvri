import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/mysql";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { isJadwalSelesai, type JenisSiaran } from "@/types";

export const dynamic = "force-dynamic";

interface BroadcastData {
  narasumberId: string;
  tanggal: string;
  waktu: string;
  program: string;
  jenisSiaran: JenisSiaran;
  topik: string;
  catatan: string;
}

function dateString(value: unknown): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? "").slice(0, 10);
}

function mapSchedule(row: RowDataPacket): BroadcastData {
  return {
    narasumberId: row.narasumber_id,
    tanggal: dateString(row.tanggal),
    waktu: row.waktu ?? "",
    program: row.program,
    jenisSiaran: row.jenis_siaran ?? "live",
    topik: row.topik ?? "",
    catatan: row.catatan ?? "",
  };
}

async function updateLastAppearance(connection: Awaited<ReturnType<typeof pool.getConnection>>, narasumberId: string) {
  await connection.query(
    "UPDATE narasumber SET last_appearance = (SELECT MAX(tanggal) FROM riwayat_siaran WHERE narasumber_id = ?) WHERE id = ?",
    [narasumberId, narasumberId]
  );
}

async function insertHistory(
  connection: Awaited<ReturnType<typeof pool.getConnection>>,
  id: string,
  data: BroadcastData
) {
  await connection.query(
    "INSERT INTO riwayat_siaran (id, narasumber_id, tanggal, waktu, program, jenis_siaran, topik, catatan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [id, data.narasumberId, data.tanggal, data.waktu || null, data.program, data.jenisSiaran, data.topik || null, data.catatan || null]
  );
  await updateLastAppearance(connection, data.narasumberId);
}

export async function POST(request: Request) {
  const session = verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ ok: false, message: "Silakan login terlebih dahulu." }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ ok: false, message: "Hanya Admin yang dapat mencatat siaran." }, { status: 403 });

  let body: { narasumberId?: unknown; jadwalId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Permintaan tidak valid." }, { status: 400 });
  }
  const useSchedule = typeof body.jadwalId === "string" && Boolean(body.jadwalId.trim());
  if (!useSchedule || typeof body.narasumberId !== "string") return NextResponse.json({ ok: false, message: "Jadwal wajib dipilih." }, { status: 400 });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    let data: BroadcastData;
    let scheduleId: string | null = null;

      const [rows] = await connection.query<RowDataPacket[]>("SELECT * FROM jadwal_siaran WHERE id = ? FOR UPDATE", [body.jadwalId]);
      const schedule = rows[0];
      if (!schedule) {
        await connection.rollback();
        return NextResponse.json({ ok: false, message: "Jadwal tidak ditemukan." }, { status: 404 });
      }
      if (schedule.narasumber_id !== body.narasumberId) {
        await connection.rollback();
        return NextResponse.json({ ok: false, message: "Jadwal bukan milik narasumber yang dipilih." }, { status: 400 });
      }
      if (schedule.status === "dibatalkan") {
        await connection.rollback();
        return NextResponse.json({ ok: false, message: "Jadwal yang dibatalkan tidak dapat dicatat." }, { status: 409 });
      }
      data = mapSchedule(schedule);
      scheduleId = schedule.id;
      if (!isJadwalSelesai(data)) {
        await connection.rollback();
        return NextResponse.json({ ok: false, message: "Siaran belum berlangsung sehingga belum dapat dicatat." }, { status: 409 });
      }

    {
      const historyId = `jadwal-${scheduleId}`;
      const [existingHistory] = await connection.query<RowDataPacket[]>("SELECT id FROM riwayat_siaran WHERE id = ? FOR UPDATE", [historyId]);
      if (existingHistory.length) {
        await connection.query("UPDATE jadwal_siaran SET status = 'sudah-tampil' WHERE id = ?", [scheduleId]);
        await updateLastAppearance(connection, data.narasumberId);
        await connection.commit();
        return NextResponse.json({ ok: true, alreadyRecorded: true, scheduleId, message: "Siaran ini sudah tercatat." });
      }
      await insertHistory(connection, historyId, data);
      await connection.query("UPDATE jadwal_siaran SET status = 'sudah-tampil' WHERE id = ?", [scheduleId]);
    }

    await connection.query(
      "INSERT INTO log_aktivitas (id, waktu, aktor, aksi, detail) VALUES (?, NOW(), ?, ?, ?)",
      [`log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, session.name, "Mencatat siaran", `Narasumber: ${data.narasumberId} · Tanggal: ${data.tanggal} · Program: ${data.program}${scheduleId ? ` · Jadwal: ${scheduleId}` : ""}`]
    );
    await connection.commit();
    return NextResponse.json({ ok: true, scheduleId, message: "Siaran berhasil dicatat." }, { status: 201 });
  } catch (error) {
    await connection.rollback();
    console.error("Gagal mencatat siaran:", error);
    return NextResponse.json({ ok: false, message: "Gagal menyimpan catatan siaran." }, { status: 500 });
  } finally {
    connection.release();
  }
}
