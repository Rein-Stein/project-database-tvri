import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/mysql";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import type { ProgramSiaran } from "@/types";
import { validateProgramName } from "@/lib/programs";

export const dynamic = "force-dynamic";

interface ProgramRow extends RowDataPacket {
  id: string;
  nama: string;
  aktif: number | boolean;
  jumlahPemakaian?: number | string;
}

function getSession() {
  return verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);
}

function isDuplicateEntry(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ER_DUP_ENTRY";
}

function mapProgram(row: ProgramRow): ProgramSiaran {
  return { id: row.id, nama: row.nama, aktif: Number(row.aktif) === 1 };
}

export async function GET() {
  if (!getSession()) return NextResponse.json({ message: "Silakan login terlebih dahulu." }, { status: 401 });

  try {
    const [rows] = await pool.query<ProgramRow[]>(`
      SELECT p.id, p.nama, p.aktif,
        COALESCE(j.jumlah, 0) + COALESCE(r.jumlah, 0) AS jumlahPemakaian
      FROM program_siaran p
      LEFT JOIN (
        SELECT program_id, COUNT(*) AS jumlah
        FROM jadwal_siaran
        WHERE program_id IS NOT NULL
        GROUP BY program_id
      ) j ON j.program_id = p.id
      LEFT JOIN (
        SELECT program_id, COUNT(*) AS jumlah
        FROM riwayat_siaran
        WHERE program_id IS NOT NULL
        GROUP BY program_id
      ) r ON r.program_id = p.id
      ORDER BY p.nama
    `);
    return NextResponse.json({
      programs: rows.map((row) => ({ ...mapProgram(row), jumlahPemakaian: Number(row.jumlahPemakaian ?? 0) })),
    });
  } catch (error) {
    console.error("Gagal mengambil daftar program:", error);
    return NextResponse.json({ message: "Gagal mengambil daftar program." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = getSession();
  if (!session) return NextResponse.json({ message: "Silakan login terlebih dahulu." }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ message: "Hanya admin yang dapat menambah program." }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Permintaan tidak valid." }, { status: 400 });
  }
  const nameResult = validateProgramName(
    body && typeof body === "object" ? (body as Record<string, unknown>).nama : undefined
  );
  if (nameResult.name === null) return NextResponse.json({ message: nameResult.error }, { status: 400 });

  try {
    const [duplicates] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM program_siaran WHERE LOWER(nama) = LOWER(?) LIMIT 1",
      [nameResult.name]
    );
    if (duplicates.length > 0) {
      return NextResponse.json({ message: "Nama program sudah digunakan." }, { status: 409 });
    }

    const program: ProgramSiaran = {
      id: `prog-${randomBytes(12).toString("hex")}`,
      nama: nameResult.name,
      aktif: true,
    };
    await pool.query("INSERT INTO program_siaran (id, nama, aktif) VALUES (?, ?, ?)", [program.id, program.nama, 1]);
    return NextResponse.json({ program }, { status: 201 });
  } catch (error) {
    if (isDuplicateEntry(error)) {
      return NextResponse.json({ message: "Nama program sudah digunakan." }, { status: 409 });
    }
    console.error("Gagal menambah program:", error);
    return NextResponse.json({ message: "Gagal menambah program." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = getSession();
  if (!session) return NextResponse.json({ message: "Silakan login terlebih dahulu." }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ message: "Hanya admin yang dapat mengubah program." }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ message: "Permintaan tidak valid." }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Permintaan tidak valid." }, { status: 400 });
  }

  if (typeof body.id !== "string" || !body.id.trim()) {
    return NextResponse.json({ message: "ID program wajib diisi." }, { status: 400 });
  }
  const hasName = Object.prototype.hasOwnProperty.call(body, "nama");
  const hasActive = Object.prototype.hasOwnProperty.call(body, "aktif");
  if (!hasName && !hasActive) return NextResponse.json({ message: "Tidak ada perubahan program." }, { status: 400 });
  if (hasActive && typeof body.aktif !== "boolean") {
    return NextResponse.json({ message: "Status aktif program tidak valid." }, { status: 400 });
  }
  const nameResult = hasName ? validateProgramName(body.nama) : null;
  if (nameResult?.error) return NextResponse.json({ message: nameResult.error }, { status: 400 });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<ProgramRow[]>(
      "SELECT id, nama, aktif FROM program_siaran WHERE id = ? FOR UPDATE",
      [body.id.trim()]
    );
    const current = rows[0];
    if (!current) {
      await connection.rollback();
      return NextResponse.json({ message: "Program tidak ditemukan." }, { status: 404 });
    }

    const nama = nameResult && nameResult.error === null ? nameResult.name : current.nama;
    const activeValue = typeof body.aktif === "boolean" ? body.aktif : undefined;
    const aktif = activeValue ?? Number(current.aktif) === 1;
    if (hasName && nama !== current.nama) {
      const [duplicates] = await connection.query<RowDataPacket[]>(
        "SELECT id FROM program_siaran WHERE LOWER(nama) = LOWER(?) AND id <> ? LIMIT 1",
        [nama, current.id]
      );
      if (duplicates.length > 0) {
        await connection.rollback();
        return NextResponse.json({ message: "Nama program sudah digunakan." }, { status: 409 });
      }
    }

    await connection.query("UPDATE program_siaran SET nama = ?, aktif = ? WHERE id = ?", [nama, aktif ? 1 : 0, current.id]);
    if (hasName && nama !== current.nama) {
      await connection.query("UPDATE jadwal_siaran SET program = ? WHERE program_id = ?", [nama, current.id]);
      await connection.query("UPDATE riwayat_siaran SET program = ? WHERE program_id = ?", [nama, current.id]);
    }
    await connection.commit();
    return NextResponse.json({ program: { id: current.id, nama, aktif } satisfies ProgramSiaran });
  } catch (error) {
    await connection.rollback();
    if (isDuplicateEntry(error)) {
      return NextResponse.json({ message: "Nama program sudah digunakan." }, { status: 409 });
    }
    console.error("Gagal mengubah program:", error);
    return NextResponse.json({ message: "Gagal mengubah program." }, { status: 500 });
  } finally {
    connection.release();
  }
}
