import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock modul pool MySQL sebelum route diimpor.
const queryMock = vi.fn();
vi.mock("@/lib/mysql", () => ({
  default: { query: (...args: unknown[]) => queryMock(...args) },
}));

// Mock verifikasi token agar tak butuh SESSION_SECRET.
const verifyTokenMock = vi.fn();
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...actual,
    verifyAccountManagementToken: (token: string | undefined | null) =>
      verifyTokenMock(token),
  };
});

// Mock cookies() dari next/headers.
const cookieGetMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: () => ({ get: cookieGetMock }),
}));

import { POST, GET } from "./route";

function postRequest(body: unknown): Request {
  return new NextRequest("http://localhost/api/users", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  queryMock.mockReset();
  verifyTokenMock.mockReset();
  cookieGetMock.mockReset();
  cookieGetMock.mockReturnValue({ value: "token" });
  verifyTokenMock.mockReturnValue(true);
});

describe("POST /api/users", () => {
  it("returns 403 when the account-management token is invalid", async () => {
    verifyTokenMock.mockReturnValue(false);
    const res = await POST(postRequest({}));
    expect(res.status).toBe(403);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/users", {
      method: "POST",
      body: "bukan-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 409 when the email belongs to the protected core account", async () => {
    const res = await POST(
      postRequest({ name: "X", email: "CORE-ACCOUNT", password: "123456" })
    );
    expect(res.status).toBe(409);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(postRequest({ name: "", email: "a@b.co", password: "123456" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 on an invalid email format", async () => {
    const res = await POST(
      postRequest({ name: "Budi", email: "bukan-email", password: "123456" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when the password is shorter than 6 characters", async () => {
    const res = await POST(
      postRequest({ name: "Budi", email: "budi@tvri.co.id", password: "123" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 409 when the email is already registered", async () => {
    queryMock.mockResolvedValue([[{ id: "existing" }]]); // SELECT email existing
    const res = await POST(
      postRequest({ name: "Budi", email: "budi@tvri.co.id", password: "123456" })
    );
    expect(res.status).toBe(409);
  });

  it("creates a user and logs the activity on success", async () => {
    queryMock
      .mockResolvedValueOnce([[]]) // SELECT email (tidak ada duplikat)
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // INSERT users
      .mockResolvedValueOnce([{ affectedRows: 1 }]); // INSERT log_aktivitas

    const res = await POST(
      postRequest({
        name: "Budi",
        email: "Budi@TVRI.co.id",
        password: "123456",
        role: "admin",
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.user.email).toBe("budi@tvri.co.id");
    expect(json.user.role).toBe("admin");

    // Query ke-2 = INSERT users; hash password TIDAK boleh sama dengan plaintext.
    const insertArgs = queryMock.mock.calls[1] as unknown[];
    expect(String(insertArgs[0])).toContain("INSERT INTO users");
    const values = insertArgs[1] as string[];
    expect(values[2]).toBe("budi@tvri.co.id");
    expect(values[3]).not.toBe("123456");
  });
});

describe("GET /api/users", () => {
  it("returns 403 when the account-management token is invalid", async () => {
    verifyTokenMock.mockReturnValue(false);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns the user list with protected core account first when absent", async () => {
    // Akun inti hanya ditambahkan bila ACCOUNT_MANAGEMENT_EMAIL terkonfigurasi.
    const prev = process.env.ACCOUNT_MANAGEMENT_EMAIL;
    process.env.ACCOUNT_MANAGEMENT_EMAIL = "core@tvri.go.id";
    try {
      queryMock.mockResolvedValue([
        [
          {
            id: "usr-2",
            name: "Sari",
            email: "sari@tvri.co.id",
            role: "operator",
            is_active: 1,
            created_at: null,
            updated_at: null,
            last_login: null,
          },
        ],
      ]);
      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.users[0].protected).toBe(true); // akun inti ditambahkan di awal
      expect(json.users[1].email).toBe("sari@tvri.co.id");
    } finally {
      if (prev === undefined) delete process.env.ACCOUNT_MANAGEMENT_EMAIL;
      else process.env.ACCOUNT_MANAGEMENT_EMAIL = prev;
    }
  });
});
