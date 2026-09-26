import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getConnection: vi.fn(),
  query: vi.fn(),
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
  verifySessionToken: vi.fn(),
}));

vi.mock("@/lib/mysql", () => ({ default: { getConnection: mocks.getConnection } }));
vi.mock("@/lib/auth", () => ({ SESSION_COOKIE_NAME: "tvri_session", verifySessionToken: mocks.verifySessionToken }));
vi.mock("next/headers", () => ({ cookies: () => ({ get: () => ({ value: "token" }) }) }));

import { POST } from "./route";

const connection = {
  query: mocks.query,
  beginTransaction: mocks.beginTransaction,
  commit: mocks.commit,
  rollback: mocks.rollback,
  release: mocks.release,
};

function request(body: unknown) {
  return new Request("http://localhost/api/siaran", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const schedule = {
  id: "j-1", narasumber_id: "n-1", tanggal: "2026-09-26", waktu: "09:00", program: "Dialog Pagi",
  jenis_siaran: "live", topik: "Pendidikan", catatan: null, status: "dijadwalkan", tanggal_baru: null,
};

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.getConnection.mockResolvedValue(connection);
  mocks.beginTransaction.mockResolvedValue(undefined);
  mocks.commit.mockResolvedValue(undefined);
  mocks.rollback.mockResolvedValue(undefined);
  mocks.release.mockReturnValue(undefined);
  mocks.verifySessionToken.mockReturnValue({ userId: "admin-1", role: "admin", name: "Admin" });
});

describe("POST /api/siaran", () => {
  it("records a selected schedule using its stored data and a stable relationship ID", async () => {
    mocks.query
      .mockResolvedValueOnce([[schedule]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await POST(request({ narasumberId: "n-1", jadwalId: "j-1" }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.scheduleId).toBe("j-1");
    expect(String(mocks.query.mock.calls[2][0])).toContain("INSERT INTO riwayat_siaran");
    expect(mocks.query.mock.calls[2][1][0]).toBe("jadwal-j-1");
    expect(mocks.query.mock.calls[2][1][3]).toBe("09:00");
    expect(mocks.query.mock.calls[2][1][4]).toBe("Dialog Pagi");
    expect(mocks.commit).toHaveBeenCalledOnce();
  });

  it("does not insert a duplicate history record for a recorded schedule", async () => {
    mocks.query
      .mockResolvedValueOnce([[{ ...schedule, status: "sudah-tampil" }]])
      .mockResolvedValueOnce([[{ id: "jadwal-j-1" }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await POST(request({ narasumberId: "n-1", jadwalId: "j-1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.alreadyRecorded).toBe(true);
    expect(mocks.query.mock.calls.some(([sql]) => String(sql).includes("INSERT INTO riwayat_siaran"))).toBe(false);
  });

  it("creates a schedule and linked history in one transaction when requested", async () => {
    mocks.query
      .mockResolvedValueOnce([[{ id: "n-1" }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await POST(request({
      narasumberId: "n-1",
      createSchedule: true,
      data: { tanggal: "2026-09-26", waktu: "09:00", program: "Dialog Pagi", jenisSiaran: "live", topik: "Pendidikan", catatan: "" },
    }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.scheduleId).toMatch(/^j-/);
    expect(String(mocks.query.mock.calls[2][0])).toContain("INSERT INTO jadwal_siaran");
    expect(String(mocks.query.mock.calls[4][0])).toContain("INSERT INTO riwayat_siaran");
    expect(mocks.query.mock.calls[4][1][0]).toBe(`jadwal-${body.scheduleId}`);
    expect(mocks.commit).toHaveBeenCalledOnce();
  });

  it("is idempotent when the same recording request is sent twice", async () => {
    // Kiriman pertama: riwayat dibuat
    mocks.query
      .mockResolvedValueOnce([[schedule]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    const first = await POST(request({ narasumberId: "n-1", jadwalId: "j-1" }));
    expect(first.status).toBe(201);

    // Kiriman kedua (refresh/double submit): tidak ada INSERT baru
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.getConnection.mockResolvedValue(connection);
    mocks.beginTransaction.mockResolvedValue(undefined);
    mocks.commit.mockResolvedValue(undefined);
    mocks.rollback.mockResolvedValue(undefined);
    mocks.release.mockReturnValue(undefined);
    mocks.verifySessionToken.mockReturnValue({ userId: "admin-1", role: "admin", name: "Admin" });
    mocks.query
      .mockResolvedValueOnce([[{ ...schedule, status: "sudah-tampil" }]])
      .mockResolvedValueOnce([[{ id: "jadwal-j-1" }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    const second = await POST(request({ narasumberId: "n-1", jadwalId: "j-1" }));
    const body = await second.json();

    expect(second.status).toBe(200);
    expect(body.alreadyRecorded).toBe(true);
    expect(mocks.query.mock.calls.filter(([sql]) => String(sql).includes("INSERT INTO riwayat_siaran"))).toHaveLength(0);
  });

  it("rejects operator direct recording so it must use approval", async () => {
    mocks.verifySessionToken.mockReturnValue({ userId: "operator-1", role: "operator", name: "Operator" });
    const response = await POST(request({ narasumberId: "n-1", jadwalId: "j-1" }));
    expect(response.status).toBe(403);
    expect(mocks.getConnection).not.toHaveBeenCalled();
  });
});