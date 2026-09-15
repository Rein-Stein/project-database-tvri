import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getWaitingPeriodSettingFromDb, saveWaitingPeriodSettingInDb } from "@/lib/settings";
import { DEFAULT_WAITING_PERIOD, normalizeWaitingPeriod } from "@/types";
import pool from "@/lib/mysql";

export const dynamic = "force-dynamic";

export async function GET() {
  // GET sengaja tanpa proteksi: masa tunggu bukan data rahasia dan dibutuhkan
  // oleh halaman publik untuk menampilkan status kelayakan narasumber.
  // Nilai hanya bisa diubah via PUT (khusus admin).
  const setting = await getWaitingPeriodSettingFromDb();
  return NextResponse.json({ ok: true, setting });
}

export async function PUT(request: Request) {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, message: "Akses ditolak." }, { status: 403 });
  }

  let body: { value?: unknown; unit?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Permintaan tidak valid." }, { status: 400 });
  }

  const value = Number(body.value ?? DEFAULT_WAITING_PERIOD.value);
  const unit = body.unit === "day" ? "day" : "month";
  const normalized = normalizeWaitingPeriod({ value, unit });

  if (!Number.isFinite(value) || value <= 0) {
    return NextResponse.json({ ok: false, message: "Nilai masa tunggu harus lebih dari 0." }, { status: 400 });
  }

  // Ambil nilai lama untuk audit log (Dari X menjadi Y)
  const previous = await getWaitingPeriodSettingFromDb();
  const saved = await saveWaitingPeriodSettingInDb(normalized, session.userId);

  // Catat perubahan ke log_aktivitas (tanpa menyimpan data sensitif)
  try {
    await pool.query(
      "INSERT INTO log_aktivitas (id, waktu, aktor, aksi, detail) VALUES (?, NOW(), ?, ?, ?)",
      [
        `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        session.name || session.email,
        "Mengubah masa tunggu narasumber",
        `Dari ${previous.value} ${previous.unit === "day" ? "Hari" : "Bulan"} menjadi ${normalized.value} ${normalized.unit === "day" ? "Hari" : "Bulan"}`,
      ]
    );
  } catch {
    // Logging gagal tidak boleh menggagalkan penyimpanan setting
  }

  return NextResponse.json({ ok: true, setting: saved, message: "Pengaturan masa tunggu berhasil disimpan." });
}
