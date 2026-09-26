import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), verifySessionToken: vi.fn() }));

vi.mock("@/lib/mysql", () => ({ default: { query: mocks.query } }));
vi.mock("@/lib/auth", () => ({ SESSION_COOKIE_NAME: "tvri_session", verifySessionToken: mocks.verifySessionToken }));
vi.mock("next/headers", () => ({ cookies: () => ({ get: () => ({ value: "token" }) }) }));

import { DELETE } from "./route";

beforeEach(() => {
  mocks.query.mockReset();
  mocks.verifySessionToken.mockReturnValue({ userId: "admin-1", role: "admin", name: "Admin" });
});

describe("DELETE /api/logs", () => {
  it("only deletes records from log_aktivitas", async () => {
    mocks.query.mockResolvedValue([{ affectedRows: 4 }]);
    const response = await DELETE();
    expect(response.status).toBe(200);
    expect(mocks.query).toHaveBeenCalledOnce();
    expect(String(mocks.query.mock.calls[0][0])).toBe("DELETE FROM log_aktivitas");
  });

  it("rejects operators server-side", async () => {
    mocks.verifySessionToken.mockReturnValue({ userId: "operator-1", role: "operator", name: "Operator" });
    const response = await DELETE();
    expect(response.status).toBe(403);
    expect(mocks.query).not.toHaveBeenCalled();
  });
});