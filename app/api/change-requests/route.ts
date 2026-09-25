import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/mysql";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import type { NarasumberChangeData } from "@/types";

export const dynamic = "force-dynamic";

interface ChangeRequestRow extends RowDataPacket {
  id: string;
  entity_type: string;
  entity_id: string;
  operator_id: string;
  operator_name: string;
  data_lama: NarasumberChangeData;
  data_baru: NarasumberChangeData;
  status: "pending" | "approved" | "rejected";
  alasan_penolakan: string | null;
  reviewed_by: string | null;
  reviewer_name: string | null;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function getSession() {
  return verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);
}

function dateValue(value: Date | null): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

function mapRequest(row: ChangeRequestRow) {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    operatorId: row.operator_id,
    operatorName: row.operator_name,
    dataLama: row.data_lama,
    dataBaru: row.data_baru,
    status: row.status,
    alasanPenolakan: row.alasan_penolakan ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewerName: row.reviewer_name ?? undefined,
    reviewedAt: dateValue(row.reviewed_at),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

const requestSelect = `
  SELECT cr.*, u.name AS operator_name, reviewer.name AS reviewer_name
  FROM change_requests cr
  INNER JOIN users u ON u.id = cr.operator_id
  LEFT JOIN users reviewer ON reviewer.id = cr.reviewed_by
`;

export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ ok: false, message: "Akses ditolak." }, { status: 401 });

  try {
    const [rows] = await pool.query<ChangeRequestRow[]>(
      `${requestSelect} WHERE ${session.role === "admin" ? "1 = 1" : "cr.operator_id = ?"} ORDER BY cr.created_at DESC`,
      session.role === "admin" ? [] : [session.userId]
    );
    return NextResponse.json({ ok: true, requests: rows.map(mapRequest) });
  } catch (error) {
    console.error("Gagal mengambil pengajuan perubahan:", error);
    return NextResponse.json({ ok: false, message: "Gagal mengambil pengajuan perubahan." }, { status: 500 });
  }
}

function normalizeData(value: unknown): NarasumberChangeData | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const fields = ["nama", "bidang", "instansi", "jabatan", "phone"] as const;
  if (fields.some((field) => typeof data[field] !== "string")) return null;
  return Object.fromEntries(fields.map((field) => [field, (data[field] as string).trim()])) as unknown as NarasumberChangeData;
}

export async function POST(request: Request) {
  const session = getSession();
  if (!session) return NextResponse.json({ ok: false, message: "Silakan login terlebih dahulu." }, { status: 401 });
  if (session.role !== "operator") return NextResponse.json({ ok: false, message: "Hanya operator yang dapat mengajukan perubahan." }, { status: 403 });

  let body: { entityType?: unknown; entityId?: unknown; dataBaru?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Permintaan tidak valid." }, { status: 400 });
  }
  if (body.entityType !== "narasumber" || typeof body.entityId !== "string" || !body.entityId.trim()) {
    return NextResponse.json({ ok: false, message: "Data entitas tidak valid." }, { status: 400 });
  }
  const dataBaru = normalizeData(body.dataBaru);
  if (!dataBaru || !dataBaru.nama || !dataBaru.bidang || !dataBaru.instansi) {
    return NextResponse.json({ ok: false, message: "Nama, bidang, dan instansi wajib diisi." }, { status: 400 });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<RowDataPacket[]>("SELECT nama, bidang, instansi, jabatan, phone FROM narasumber WHERE id = ? FOR UPDATE", [body.entityId]);
    const current = rows[0];
    if (!current) {
      await connection.rollback();
      return NextResponse.json({ ok: false, message: "Narasumber tidak ditemukan." }, { status: 404 });
    }

    const dataLama = normalizeData({
      nama: current.nama,
      bidang: current.bidang,
      instansi: current.instansi,
      jabatan: current.jabatan ?? "",
      phone: current.phone ?? "",
    })!;
    if (JSON.stringify(dataLama) === JSON.stringify(dataBaru)) {
      await connection.rollback();
      return NextResponse.json({ ok: false, message: "Tidak ada perubahan yang diajukan." }, { status: 400 });
    }

    const [pending] = await connection.query<RowDataPacket[]>(
      "SELECT id FROM change_requests WHERE entity_type = 'narasumber' AND entity_id = ? AND operator_id = ? AND status = 'pending' LIMIT 1",
      [body.entityId, session.userId]
    );
    if (pending.length) {
      await connection.rollback();
      return NextResponse.json({ ok: false, message: "Masih ada pengajuan yang menunggu persetujuan untuk narasumber ini." }, { status: 409 });
    }

    const id = `cr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await connection.query(
      "INSERT INTO change_requests (id, entity_type, entity_id, operator_id, data_lama, data_baru, status) VALUES (?, 'narasumber', ?, ?, ?, ?, 'pending')",
      [id, body.entityId, session.userId, JSON.stringify(dataLama), JSON.stringify(dataBaru)]
    );
    await connection.commit();
    return NextResponse.json({ ok: true, id, message: "Perubahan diajukan dan menunggu persetujuan Admin." }, { status: 201 });
  } catch (error) {
    await connection.rollback();
    console.error("Gagal membuat pengajuan perubahan:", error);
    return NextResponse.json({ ok: false, message: "Gagal menyimpan pengajuan perubahan." }, { status: 500 });
  } finally {
    connection.release();
  }
}
