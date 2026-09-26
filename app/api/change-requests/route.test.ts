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
});