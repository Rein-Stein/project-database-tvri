import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  getConnection: vi.fn(),
  connectionQuery: vi.fn(),
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
  verifySessionToken: vi.fn(),
}));

vi.mock("@/lib/mysql", () => ({
  default: { query: mocks.query, getConnection: mocks.getConnection },
}));
vi.mock("@/lib/auth", () => ({
  SESSION_COOKIE_NAME: "tvri_session",
  verifySessionToken: mocks.verifySessionToken,
}));
vi.mock("next/headers", () => ({ cookies: () => ({ get: () => ({ value: "token" }) }) }));

import { GET, PATCH, POST } from "./route";

const connection = {
  query: mocks.connectionQuery,
  beginTransaction: mocks.beginTransaction,
  commit: mocks.commit,
  rollback: mocks.rollback,
  release: mocks.release,
};

function request(method: string, body?: unknown) {
  return new Request("http://localhost/api/programs", {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
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

describe("API daftar program", () => {
  it("mengembalikan program berikut jumlah pemakaiannya untuk pengguna login", async () => {
    mocks.query.mockResolvedValueOnce([[{ id: "prog-1", nama: "Dialog Pagi", aktif: 1, jumlahPemakaian: 4 }]]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      programs: [{ id: "prog-1", nama: "Dialog Pagi", aktif: true, jumlahPemakaian: 4 }],
    });
  });

  it("membuat program dengan nama yang sudah di-trim", async () => {
    mocks.query.mockResolvedValueOnce([[]]).mockResolvedValueOnce([{ affectedRows: 1 }]);
    const response = await POST(request("POST", { nama: "  Dialog Pagi  " }));
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.program.nama).toBe("Dialog Pagi");
    expect(body.program.id).toMatch(/^prog-[a-f0-9]+$/);
    expect(mocks.query.mock.calls[0][0]).toContain("LOWER(nama)");
  });

  it("memperbarui nama program dan teks terkait dalam satu transaksi", async () => {
    mocks.connectionQuery
      .mockResolvedValueOnce([[{ id: "prog-1", nama: "Nama lama", aktif: 1 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 2 }])
      .mockResolvedValueOnce([{ affectedRows: 3 }]);

    const response = await PATCH(request("PATCH", { id: "prog-1", nama: "Nama baru" }));
    expect(response.status).toBe(200);
    expect(mocks.connectionQuery.mock.calls[2][1]).toEqual(["Nama baru", 1, "prog-1"]);
    expect(mocks.connectionQuery.mock.calls[3][1]).toEqual(["Nama baru", "prog-1"]);
    expect(mocks.connectionQuery.mock.calls[4][1]).toEqual(["Nama baru", "prog-1"]);
    expect(mocks.commit).toHaveBeenCalledOnce();
  });

  it("menolak mutasi program oleh operator sebelum mengakses database", async () => {
    mocks.verifySessionToken.mockReturnValue({ userId: "operator-1", role: "operator", name: "Operator" });
    const response = await POST(request("POST", { nama: "Dialog Pagi" }));
    expect(response.status).toBe(403);
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
