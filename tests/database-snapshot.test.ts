import { describe, expect, it } from "vitest";
import { validateSnapshot, withSnapshotDefaults, type DatabaseSnapshot } from "@/lib/database";

describe("snapshot database", () => {
  const legacySnapshot: DatabaseSnapshot = {
    narasumber: [{
      id: "n1",
      nama: "Narasumber",
      bidang: "Pendidikan",
      instansi: "Dinas Pendidikan",
      lastAppearance: null,
      riwayat: [{ id: "r1", tanggal: "2026-11-10", program: "Dialog Pagi" }],
    }],
    jadwal: [{
      id: "j1",
      narasumberId: "n1",
      tanggal: "2026-11-12",
      program: "Dialog Pagi",
      status: "dijadwalkan",
    }],
    log: [],
  };

  it("accepts legacy snapshots and supplies the new field defaults", () => {
    expect(validateSnapshot(legacySnapshot)).toBeNull();
    expect(withSnapshotDefaults(legacySnapshot)).toMatchObject({
      narasumber: [{ aturanJeda: "semua_program", riwayat: [{ programId: null }] }],
      jadwal: [{ programId: null }],
    });
  });

  it("rejects invalid new fields without rejecting omitted legacy fields", () => {
    expect(validateSnapshot({
      ...legacySnapshot,
      narasumber: [{ ...legacySnapshot.narasumber[0], aturanJeda: "program_tertentu" }],
    })).toBe("Aturan jeda narasumber tidak valid.");
    expect(validateSnapshot({
      ...legacySnapshot,
      jadwal: [{ ...legacySnapshot.jadwal[0], programId: 7 }],
    })).toBe("programId jadwal harus berupa string atau null.");
  });
});
