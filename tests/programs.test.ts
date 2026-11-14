import { describe, expect, it } from "vitest";
import { validateProgramName } from "@/lib/programs";

describe("validasi nama program", () => {
  it("trim nama dan menerima hingga 180 karakter", () => {
    expect(validateProgramName("  Dialog Pagi  ")).toEqual({ name: "Dialog Pagi", error: null });
    expect(validateProgramName("a".repeat(180))).toEqual({ name: "a".repeat(180), error: null });
  });

  it("menolak nama kosong, bukan teks, dan lebih dari 180 karakter", () => {
    expect(validateProgramName("  ").error).toBe("Nama program wajib diisi.");
    expect(validateProgramName(null).error).toBe("Nama program wajib berupa teks.");
    expect(validateProgramName("a".repeat(181)).error).toBe("Nama program maksimal 180 karakter.");
  });
});
