import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getConnection: vi.fn(),
  connectionQuery: vi.fn(),
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
  verifySessionToken: vi.fn(),
}));

vi.mock("@/lib/mysql", () => ({ default: { getConnection: mocks.getConnection } }));
vi.mock("@/lib/auth", () => ({ SESSION_COOKIE_NAME: "tvri_session", verifySessionToken: mocks.verifySessionToken }));
vi.mock("next/headers", () => ({ cookies: () => ({ get: () => ({ value: "token" }) }) }));

import { DELETE, PATCH } from "./route";

const connection = {
  query: mocks.connectionQuery,
  beginTransaction: mocks.beginTransaction,
  commit: mocks.commit,
  rollback: mocks.rollback,
  release: mocks.release,
};

function patchRequest(body: unknown) {
  return new Request("http://localhost/api/change-requests/cr-1", {
    method: "PATCH",
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
  mocks.verifySessionToken.mockReturnValue({ userId: "admin-1", role: "admin", name: "Admin" });
});

describe("PATCH /api/change-requests/[id]", () => {
  it("inserts an approved narasumber and closes the request in one transaction", async () => {
    mocks.connectionQuery
      .mockResolvedValueOnce([[{
        id: "cr-1",
        entity_type: "narasumber_create",
        entity_id: "n-new",
        operator_id: "operator-1",
        data_lama: {},
        data_baru: { nama: "Sari", bidang: "Pendidikan", instansi: "Dinas Pendidikan", jabatan: "Kepala", phone: "0812" },
        status: "pending",
      }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await PATCH(patchRequest({ action: "approve" }), { params: { id: "cr-1" } });

    expect(response.status).toBe(200);
    expect(String(mocks.connectionQuery.mock.calls[2][0])).toContain("INSERT INTO narasumber");
    expect(String(mocks.connectionQuery.mock.calls[3][0])).toContain("UPDATE change_requests");
    expect(mocks.beginTransaction).toHaveBeenCalledOnce();
    expect(mocks.commit).toHaveBeenCalledOnce();
  });

  it("continues to apply existing narasumber requests using the legacy entity type", async () => {
    mocks.connectionQuery
      .mockResolvedValueOnce([[{
        id: "cr-legacy",
        entity_type: "narasumber",
        entity_id: "n-1",
        operator_id: "operator-1",
        data_lama: { nama: "Sari", bidang: "Pendidikan", instansi: "Dinas", jabatan: "", phone: "" },
        data_baru: { nama: "Sari Baru", bidang: "Pendidikan", instansi: "Dinas", jabatan: "", phone: "" },
        status: "pending",
      }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await PATCH(patchRequest({ action: "approve" }), { params: { id: "cr-legacy" } });

    expect(response.status).toBe(200);
    expect(String(mocks.connectionQuery.mock.calls[1][0])).toContain("UPDATE narasumber");
    expect(mocks.commit).toHaveBeenCalledOnce();
  });

  it("applies an approved jadwal_siaran_update to the primary schedule row", async () => {
    const oldData = {
      narasumberId: "n-1", tanggal: "2026-10-05", waktu: "09:00", program: "Dialog Pagi",
      jenisSiaran: "live", topik: "Topik lama", catatan: "", status: "dijadwalkan", tanggalBaru: "",
    };
    mocks.connectionQuery
      .mockResolvedValueOnce([[{
        id: "cr-schedule",
        entity_type: "jadwal_siaran_update",
        entity_id: "j-1",
        operator_id: "operator-1",
        data_lama: oldData,
        data_baru: { ...oldData, topik: "Topik baru" },
        status: "pending",
      }]])
      .mockResolvedValueOnce([[{
        narasumber_id: "n-1", tanggal: "2026-10-05", waktu: "09:00", program: "Dialog Pagi",
        jenis_siaran: "live", topik: "Topik lama", catatan: null, status: "dijadwalkan", tanggal_baru: null,
      }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await PATCH(patchRequest({ action: "approve" }), { params: { id: "cr-schedule" } });

    expect(response.status).toBe(200);
    expect(String(mocks.connectionQuery.mock.calls[2][0])).toContain("UPDATE jadwal_siaran");
    expect(mocks.connectionQuery.mock.calls[2][1]).toContain("Topik baru");
    expect(mocks.commit).toHaveBeenCalledOnce();
  });

  it("creates schedule and linked history only once when an operator request is approved", async () => {
    const data = {
      narasumberId: "n-1", tanggal: "2026-09-25", waktu: "10:00", program: "Berita Kaltim",
      jenisSiaran: "live", topik: "Pendidikan", catatan: "", status: "sudah-tampil", tanggalBaru: "",
    };
    mocks.connectionQuery
      .mockResolvedValueOnce([[{
        id: "cr-jadwal",
        entity_type: "jadwal_siaran_create",
        entity_id: "j-new-1",
        operator_id: "operator-1",
        data_lama: {},
        data_baru: data,
        status: "pending",
      }]])
      .mockResolvedValueOnce([[]])           // id jadwal belum ada
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // INSERT jadwal
      .mockResolvedValueOnce([[]])           // riwayat belum ada
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // INSERT riwayat
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // update last_appearance
      .mockResolvedValueOnce([{ affectedRows: 1 }]); // update change_requests

    const response = await PATCH(patchRequest({ action: "approve" }), { params: { id: "cr-jadwal" } });

    expect(response.status).toBe(200);
    expect(String(mocks.connectionQuery.mock.calls[2][0])).toContain("INSERT INTO jadwal_siaran");
    expect(String(mocks.connectionQuery.mock.calls[4][0])).toContain("INSERT INTO riwayat_siaran");
    expect(mocks.connectionQuery.mock.calls[4][1][0]).toBe("jadwal-j-new-1");
    expect(mocks.connectionQuery.mock.calls.filter(([sql]) => String(sql).includes("INSERT INTO riwayat_siaran"))).toHaveLength(1);
    expect(mocks.commit).toHaveBeenCalledOnce();
  });

  it("rejects processing the same request twice", async () => {
    mocks.connectionQuery.mockResolvedValueOnce([[{ id: "cr-dup", status: "approved" }]]);
    const response = await PATCH(patchRequest({ action: "approve" }), { params: { id: "cr-dup" } });
    expect(response.status).toBe(409);
    expect(mocks.rollback).toHaveBeenCalledOnce();
    expect(mocks.commit).not.toHaveBeenCalled();
  });

  it("does not allow an operator to process a request", async () => {
    mocks.verifySessionToken.mockReturnValue({ userId: "operator-1", role: "operator", name: "Operator" });
    const response = await PATCH(patchRequest({ action: "approve" }), { params: { id: "cr-1" } });
    expect(response.status).toBe(403);
    expect(mocks.getConnection).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/change-requests/[id]", () => {
  it("refuses to delete pending history", async () => {
    mocks.connectionQuery.mockResolvedValueOnce([[{ status: "pending" }]]);
    const response = await DELETE(new Request("http://localhost/api/change-requests/cr-1"), { params: { id: "cr-1" } });
    expect(response.status).toBe(409);
    expect(mocks.connectionQuery.mock.calls.some(([sql]) => String(sql).startsWith("DELETE FROM change_requests"))).toBe(false);
    expect(mocks.rollback).toHaveBeenCalledOnce();
  });
});