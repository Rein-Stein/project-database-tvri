import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  getConnection: vi.fn(),
  connectionQuery: vi.fn(),
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
  verifySessionToken: vi.fn(),
}));

vi.mock("@/lib/mysql", () => ({ default: { query: mocks.poolQuery, getConnection: mocks.getConnection } }));
vi.mock("@/lib/auth", () => ({ SESSION_COOKIE_NAME: "tvri_session", verifySessionToken: mocks.verifySessionToken }));
vi.mock("next/headers", () => ({ cookies: () => ({ get: () => ({ value: "token" }) }) }));

import { POST } from "./route";

const connection = {
  query: mocks.connectionQuery,
  beginTransaction: mocks.beginTransaction,
  commit: mocks.commit,
  rollback: mocks.rollback,
  release: mocks.release,
};

function request(body: unknown) {
  return new Request("http://localhost/api/change-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.getConnection.mockResolvedValue(connection);
  mocks.beginTransaction.mockResolvedValue(undefined);
  mocks.commit.mockResolvedValue(undefined);
  mocks.rollback.mockResolvedValue(undefined);
  mocks.release.mockReturnValue(undefined);
  mocks.verifySessionToken.mockReturnValue({ userId: "operator-1", role: "operator", name: "Operator" });
});

describe("POST /api/change-requests", () => {
  it("stores a complete narasumber_create request without inserting a narasumber", async () => {
    mocks.connectionQuery
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await POST(request({
      entityType: "narasumber_create",
      dataBaru: { nama: "Sari", bidang: "Pendidikan", instansi: "Dinas Pendidikan", jabatan: "Kepala", phone: "0812" },
    }));

    expect(response.status).toBe(201);
    const insertSql = String(mocks.connectionQuery.mock.calls[1][0]);
    const values = mocks.connectionQuery.mock.calls[1][1] as unknown[];
    expect(insertSql).toContain("INSERT INTO change_requests");
    expect(values[1]).toBe("narasumber_create");
    expect(JSON.parse(String(values[5]))).toEqual({ nama: "Sari", bidang: "Pendidikan", instansi: "Dinas Pendidikan", jabatan: "Kepala", phone: "0812" });
    expect(mocks.connectionQuery.mock.calls.some(([sql]) => String(sql).includes("INSERT INTO narasumber"))).toBe(false);
    expect(mocks.commit).toHaveBeenCalledOnce();
  });

  it("rejects non-operator submission before accessing the database", async () => {
    mocks.verifySessionToken.mockReturnValue({ userId: "admin-1", role: "admin", name: "Admin" });
    const response = await POST(request({ entityType: "narasumber_create", dataBaru: {} }));
    expect(response.status).toBe(403);
    expect(mocks.getConnection).not.toHaveBeenCalled();
  });

  it("uses a stable schedule entity ID so an identical retry stays one pending request", async () => {
    const body = {
      entityType: "jadwal_siaran_create",
      dataBaru: {
        narasumberId: "n-1", tanggal: "2026-09-25", waktu: "10:00", program: "Berita Kaltim", programId: "prog-1",
        jenisSiaran: "live", topik: "Pendidikan", catatan: "", status: "dijadwalkan", tanggalBaru: "",
      },
    };
    mocks.connectionQuery
      .mockResolvedValueOnce([[{ id: "prog-1", nama: "Berita Kaltim", aktif: 1 }]])
      .mockResolvedValueOnce([[{ id: "n-1" }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    const first = await POST(request(body));
    const firstPayload = await first.json();
    expect(firstPayload).toEqual(expect.objectContaining({ message: expect.any(String) }));
    expect(first.status, JSON.stringify(firstPayload)).toBe(201);
    const firstInsert = mocks.connectionQuery.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO change_requests"));
    const firstEntityId = firstInsert?.[1][2];
    expect(firstEntityId).toBeTypeOf("string");

    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.getConnection.mockResolvedValue(connection);
    mocks.beginTransaction.mockResolvedValue(undefined);
    mocks.rollback.mockResolvedValue(undefined);
    mocks.release.mockReturnValue(undefined);
    mocks.verifySessionToken.mockReturnValue({ userId: "operator-1", role: "operator", name: "Operator" });
    mocks.connectionQuery
      .mockResolvedValueOnce([[{ id: "prog-1", nama: "Berita Kaltim", aktif: 1 }]])
      .mockResolvedValueOnce([[{ id: "n-1" }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ id: "existing" }]]);
    const retry = await POST(request(body));

    expect(retry.status).toBe(409);
    expect(mocks.connectionQuery.mock.calls.find(([sql]) => String(sql).includes("SELECT id FROM change_requests"))?.[1]).toContain(firstEntityId);
    expect(mocks.connectionQuery.mock.calls.some(([sql]) => String(sql).includes("INSERT INTO change_requests"))).toBe(false);
  });

  it("rejects an operator schedule that conflicts with another scheduled appearance", async () => {
    mocks.connectionQuery
      .mockResolvedValueOnce([[{ id: "prog-1", nama: "Dialog Siang", aktif: 1 }]])
      .mockResolvedValueOnce([[{ id: "n-1", last_appearance: null }]])
      .mockResolvedValueOnce([[{
        sumber: "jadwal", id: "j-existing", tanggal: "2026-11-17", program: "Dialog Pagi", program_id: "prog-2",
      }]])
      .mockResolvedValueOnce([[{ aturan_jeda: "semua_program" }]])
      .mockResolvedValueOnce([[
        { key: "waiting_period_value", value: "5" },
        { key: "waiting_period_unit", value: "day" },
      ]]);

    const response = await POST(request({
      entityType: "jadwal_siaran_create",
      dataBaru: {
        narasumberId: "n-1", tanggal: "2026-11-14", waktu: "10:00", program: "Dialog Siang", programId: "prog-1",
        jenisSiaran: "live", topik: "", catatan: "", status: "dijadwalkan", tanggalBaru: "",
      },
    }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toContain("17 November 2026");
    expect(body.message).toContain("22 November 2026");
    expect(mocks.connectionQuery.mock.calls.some(([sql]) => String(sql).includes("DATE_FORMAT(tanggal, '%Y-%m-%d')"))).toBe(true);
    expect(mocks.connectionQuery.mock.calls.some(([sql]) => String(sql).includes("INSERT INTO change_requests"))).toBe(false);
    expect(mocks.rollback).toHaveBeenCalledOnce();
  });

  it("allows a different program for a per_program narasumber", async () => {
    mocks.connectionQuery
      .mockResolvedValueOnce([[{ id: "prog-b", nama: "Program B", aktif: 1 }]])
      .mockResolvedValueOnce([[{ id: "n-1", last_appearance: null }]])
      .mockResolvedValueOnce([[{
        sumber: "riwayat", id: "r-a", tanggal: "2026-11-10", program: "Program A", program_id: "prog-a",
      }]])
      .mockResolvedValueOnce([[{ aturan_jeda: "per_program" }]])
      .mockResolvedValueOnce([[{ key: "waiting_period_value", value: "5" }, { key: "waiting_period_unit", value: "day" }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await POST(request({
      entityType: "jadwal_siaran_create",
      dataBaru: {
        narasumberId: "n-1", tanggal: "2026-11-12", waktu: "10:00", program: "Program B", programId: "prog-b",
        jenisSiaran: "live", topik: "", catatan: "", status: "dijadwalkan", tanggalBaru: "",
      },
    }));

    expect(response.status).toBe(201);
  });

  it("rejects a matching program for a per_program narasumber", async () => {
    mocks.connectionQuery
      .mockResolvedValueOnce([[{ id: "prog-a", nama: "Program A", aktif: 1 }]])
      .mockResolvedValueOnce([[{ id: "n-1", last_appearance: null }]])
      .mockResolvedValueOnce([[{
        sumber: "riwayat", id: "r-a", tanggal: "2026-11-10", program: "Program A", program_id: "prog-a",
      }]])
      .mockResolvedValueOnce([[{ aturan_jeda: "per_program" }]])
      .mockResolvedValueOnce([[{ key: "waiting_period_value", value: "5" }, { key: "waiting_period_unit", value: "day" }]]);

    const response = await POST(request({
      entityType: "jadwal_siaran_create",
      dataBaru: {
        narasumberId: "n-1", tanggal: "2026-11-12", waktu: "10:00", program: "Program A", programId: "prog-a",
        jenisSiaran: "live", topik: "", catatan: "", status: "dijadwalkan", tanggalBaru: "",
      },
    }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toContain("program Program A");
    expect(body.message).toContain("15 November 2026");
    expect(mocks.rollback).toHaveBeenCalledOnce();
  });

  it("rejects inactive programs before storing an operator request", async () => {
    mocks.connectionQuery.mockResolvedValueOnce([[{ id: "prog-1", nama: "Program", aktif: 0 }]]);
    const response = await POST(request({
      entityType: "jadwal_siaran_create",
      dataBaru: {
        narasumberId: "n-1", tanggal: "2026-11-12", waktu: "10:00", program: "Program", programId: "prog-1",
        jenisSiaran: "live", topik: "", catatan: "", status: "dijadwalkan", tanggalBaru: "",
      },
    }));
    expect(response.status).toBe(400);
    expect(mocks.connectionQuery).toHaveBeenCalledOnce();
    expect(mocks.rollback).toHaveBeenCalledOnce();
  });
});