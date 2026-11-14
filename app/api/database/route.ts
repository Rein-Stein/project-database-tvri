import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "@/lib/mysql";
import { validateSnapshot, withSnapshotDefaults, type DatabaseSnapshot } from "@/lib/database";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

function configured() {
  return Boolean(process.env.DB_NAME);
}

/** Mengubah nilai kolom tanggal (Date atau string) menjadi string YYYY-MM-DD. */
function toISODate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "");
}

function mapRiwayat(rows: RowDataPacket[]): Map<string, DatabaseSnapshot["narasumber"][number]["riwayat"]> {
  const histories = new Map<string, DatabaseSnapshot["narasumber"][number]["riwayat"]>();
  for (const row of rows) {
    const list = histories.get(row.narasumber_id) ?? [];
    list.push({
      id: row.id,
      ...(typeof row.id === "string" && row.id.startsWith("jadwal-") ? { jadwalId: row.id.slice("jadwal-".length) } : {}),
      tanggal: toISODate(row.tanggal),
      waktu: row.waktu,
      program: row.program,
      programId: row.program_id ?? null,
      jenisSiaran: row.jenis_siaran ?? "live",
      topik: row.topik,
      catatan: row.catatan,
    });
    histories.set(row.narasumber_id, list);
  }
  return histories;
}

function mapNarasumber(rows: RowDataPacket[], histories: Map<string, DatabaseSnapshot["narasumber"][number]["riwayat"]>): DatabaseSnapshot["narasumber"] {
  return rows.map((row) => ({
    id: row.id,
    nama: row.nama,
    bidang: row.bidang,
    instansi: row.instansi,
    jabatan: row.jabatan ?? undefined,
    phone: row.phone ?? undefined,
    aturanJeda: row.aturan_jeda ?? "semua_program",
    lastAppearance: row.last_appearance ? toISODate(row.last_appearance) : null,
    riwayat: histories.get(row.id) ?? [],
  }));
}

function mapJadwal(rows: RowDataPacket[]): DatabaseSnapshot["jadwal"] {
  return rows.map((row) => ({
    id: row.id,
    narasumberId: row.narasumber_id,
    tanggal: toISODate(row.tanggal),
    waktu: row.waktu,
    program: row.program,
    programId: row.program_id ?? null,
    jenisSiaran: row.jenis_siaran ?? "live",
    topik: row.topik,
    catatan: row.catatan,
    status: row.status,
    tanggalBaru: row.tanggal_baru ? toISODate(row.tanggal_baru) : undefined,
  }));
}

function mapLog(rows: RowDataPacket[]): DatabaseSnapshot["log"] {
  return rows.map((row) => ({
    id: row.id,
    waktu: row.waktu instanceof Date ? row.waktu.toISOString() : String(row.waktu ?? ""),
    aktor: row.aktor,
    aksi: row.aksi,
    detail: row.detail,
  }));
}

export async function GET() {
  if (!configured()) return NextResponse.json({ configured: false }, { status: 503 });

  try {
    const [narasumberRows] = await pool.query<RowDataPacket[]>("SELECT * FROM narasumber ORDER BY nama");
    const [riwayatRows] = await pool.query<RowDataPacket[]>("SELECT * FROM riwayat_siaran ORDER BY tanggal");
    const [jadwalRows] = await pool.query<RowDataPacket[]>("SELECT * FROM jadwal_siaran ORDER BY tanggal");
    const [logRows] = await pool.query<RowDataPacket[]>("SELECT * FROM log_aktivitas ORDER BY waktu DESC LIMIT 200");
    const histories = mapRiwayat(riwayatRows);
    const snapshot: DatabaseSnapshot = {
      narasumber: mapNarasumber(narasumberRows, histories),
      jadwal: mapJadwal(jadwalRows),
      log: mapLog(logRows),
    };
    return NextResponse.json({ configured: true, snapshot });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Database error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!configured()) return NextResponse.json({ configured: false }, { status: 503 });

  // Hanya admin yang sudah login (cookie sesi valid) boleh menulis data.
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let snapshot: DatabaseSnapshot;
  try {
    const body: unknown = await request.json();
    const validationError = validateSnapshot(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    snapshot = withSnapshotDefaults(body as DatabaseSnapshot);
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("DELETE FROM riwayat_siaran");
    await connection.query("DELETE FROM jadwal_siaran");
    await connection.query("DELETE FROM narasumber");
    await connection.query("DELETE FROM log_aktivitas");
    for (const row of snapshot.narasumber) {
      await connection.query<ResultSetHeader>("INSERT INTO narasumber (id,nama,bidang,instansi,jabatan,phone,last_appearance,aturan_jeda) VALUES (?,?,?,?,?,?,?,?)", [row.id, row.nama, row.bidang, row.instansi, row.jabatan ?? null, row.phone ?? null, row.lastAppearance, row.aturanJeda ?? "semua_program"]);
      for (const history of row.riwayat) await connection.query("INSERT INTO riwayat_siaran (id,narasumber_id,tanggal,waktu,program,program_id,jenis_siaran,topik,catatan) VALUES (?,?,?,?,?,?,?,?,?)", [history.id, row.id, history.tanggal, history.waktu ?? null, history.program, history.programId ?? null, history.jenisSiaran ?? "live", history.topik ?? null, history.catatan ?? null]);
    }
    for (const row of snapshot.jadwal) await connection.query("INSERT INTO jadwal_siaran (id,narasumber_id,tanggal,waktu,program,program_id,jenis_siaran,topik,catatan,status,tanggal_baru) VALUES (?,?,?,?,?,?,?,?,?,?,?)", [row.id, row.narasumberId, row.tanggal, row.waktu ?? null, row.program, row.programId ?? null, row.jenisSiaran ?? "live", row.topik ?? null, row.catatan ?? null, row.status, row.tanggalBaru ?? null]);
    for (const row of snapshot.log) await connection.query("INSERT INTO log_aktivitas (id,waktu,aktor,aksi,detail) VALUES (?,?,?,?,?)", [row.id, new Date(row.waktu), row.aktor, row.aksi, row.detail ?? null]);
    await connection.commit();
    return NextResponse.json({ ok: true });
  } catch (error) {
    await connection.rollback();
    return NextResponse.json({ error: error instanceof Error ? error.message : "Database error" }, { status: 500 });
  } finally {
    connection.release();
  }
}
