import { describe, expect, it } from "vitest";
import { collectPenampilan, describeRotationConflict, findRotationConflict, normalizeProgramName } from "@/types";

describe("masa tunggu terhadap jadwal yang belum tayang", () => {
  const tigaBulan = { value: 3, unit: "month" as const };
  const narasumber = {
    id: "n1",
    lastAppearance: "2026-05-10",
    riwayat: [{ id: "r1", tanggal: "2026-05-10", program: "Dialog Pagi" }],
  };
  const jadwal = (id: string, tanggal: string, status: "dijadwalkan" | "sudah-tampil" | "dibatalkan" | "ditunda", narasumberId = "n1") => ({
    id, narasumberId, tanggal, program: "Dialog Pagi", status,
  });

  describe("aturan jeda per program", () => {
    const limaHari = { value: 5, unit: "day" as const };
    const narasumber = { id: "n1", lastAppearance: null, riwayat: [] };
    const opsi = (programId: string | null, programNama: string | null, aturanJeda: "semua_program" | "per_program" = "per_program") => ({
      aturanJeda,
      programId,
      programNama,
    });
    const riwayat = (id: string, tanggal: string, program: string, programId?: string | null) => ({
      id, tanggal, program, programId,
    });
    const jadwal = (id: string, tanggal: string, program: string, programId?: string | null) => ({
      id, narasumberId: "n1", tanggal, program, programId, status: "dijadwalkan" as const,
    });

    it("menerapkan jeda 5 hari pada program yang sama, tetapi bukan program lain", () => {
      const appearances = collectPenampilan(
        { ...narasumber, riwayat: [riwayat("r1", "2026-11-10", "Program A", "a")] },
        []
      );
      expect(findRotationConflict("2026-11-12", appearances, limaHari, [], opsi("a", "Program A"))?.bolehMulai).toBe("2026-11-15");
      expect(findRotationConflict("2026-11-12", appearances, limaHari, [], opsi("b", "Program B"))).toBeNull();
      expect(findRotationConflict("2026-11-12", appearances, limaHari, [], opsi("b", "Program B", "semua_program"))).not.toBeNull();
    });

    it("menerapkan jeda per program juga terhadap jadwal yang lebih awal dari jadwal mendatang", () => {
      const appearances = collectPenampilan(narasumber, [jadwal("j1", "2026-11-17", "Program A", "a")]);
      expect(findRotationConflict("2026-11-14", appearances, limaHari, [], opsi("a", "Program A"))?.arah).toBe("sebelum");
      expect(findRotationConflict("2026-11-14", appearances, limaHari, [], opsi("b", "Program B"))).toBeNull();
    });

    it("mencocokkan programId walau nama berbeda dan nama tanpa beda kapitalisasi atau spasi", () => {
      const byId = collectPenampilan(
        { ...narasumber, riwayat: [riwayat("r1", "2026-11-10", "Nama lama", "a")] },
        []
      );
      expect(findRotationConflict("2026-11-12", byId, limaHari, [], opsi("a", "Nama baru"))).not.toBeNull();

      const byName = collectPenampilan(
        { ...narasumber, riwayat: [riwayat("r2", "2026-11-10", "  Dialog   Pagi ")] },
        []
      );
      expect(normalizeProgramName("  Dialog   Pagi ")).toBe("dialog pagi");
      expect(findRotationConflict("2026-11-12", byName, limaHari, [], opsi(null, "dialog pagi"))).not.toBeNull();
    });

    it("mengelompokkan penampilan tanpa program secara terpisah dan tetap mengecualikan jadwal yang diedit", () => {
      const appearances = collectPenampilan(narasumber, [jadwal("j1", "2026-11-10", "", null)]);
      expect(findRotationConflict("2026-11-12", appearances, limaHari, [], opsi(null, "Program A"))).toBeNull();
      expect(findRotationConflict("2026-11-12", appearances, limaHari, [], opsi(null, null))).not.toBeNull();
      expect(findRotationConflict("2026-11-12", appearances, limaHari, ["jadwal-j1"], opsi(null, null))).toBeNull();
    });

    it("menyebut nama program dan sisa hari dalam pesan konflik", () => {
      const appearances = collectPenampilan(
        { ...narasumber, riwayat: [riwayat("r1", "2026-11-10", "Program A", "a")] },
        []
      );
      const conflict = findRotationConflict("2026-11-12", appearances, limaHari, [], opsi("a", "Program A"))!;
      expect(describeRotationConflict(conflict, limaHari, "Budi")).toContain("Budi sedang dalam masa tunggu untuk program Program A, 3 hari lagi");
    });

    it("menjelaskan batas tanggal aman ketika jadwal program yang sama berada sesudah tanggal pilihan", () => {
      const appearances = collectPenampilan(narasumber, [jadwal("j1", "2026-11-17", "Program A", "a")]);
      const conflict = findRotationConflict("2026-11-14", appearances, limaHari, [], opsi("a", "Program A"))!;
      const text = describeRotationConflict(conflict, limaHari);
      expect(text).toContain("Narasumber ini");
      expect(text).toContain("terlalu dekat");
      expect(text).toContain("tanggal paling lambat 12 November 2026");
    });
  });

  it("menolak jadwal kedua untuk narasumber yang sama beberapa hari setelah jadwal pertama", () => {
    const list = collectPenampilan(narasumber, [jadwal("j1", "2026-11-16", "dijadwalkan")]);
    const conflict = findRotationConflict("2026-11-18", list, tigaBulan);
    expect(conflict).not.toBeNull();
    expect(conflict?.arah).toBe("sesudah");
    expect(conflict?.bolehMulai).toBe("2027-02-16");
  });

  it("menolak tanggal yang sama persis dan tanggal sehari sebelum masa tunggu berakhir", () => {
    const list = collectPenampilan(narasumber, [jadwal("j1", "2026-11-16", "dijadwalkan")]);
    expect(findRotationConflict("2026-11-16", list, tigaBulan)).not.toBeNull();
    expect(findRotationConflict("2027-02-15", list, tigaBulan)).not.toBeNull();
  });

  it("mengizinkan tepat pada hari masa tunggu berakhir", () => {
    const list = collectPenampilan(narasumber, [jadwal("j1", "2026-11-16", "dijadwalkan")]);
    expect(findRotationConflict("2027-02-16", list, tigaBulan)).toBeNull();
  });

  it("memeriksa juga jadwal yang ada SETELAH tanggal yang dipilih", () => {
    const list = collectPenampilan(narasumber, [jadwal("j1", "2026-12-10", "dijadwalkan")]);
    const conflict = findRotationConflict("2026-12-05", list, tigaBulan);
    expect(conflict?.arah).toBe("sebelum");
    expect(conflict?.bolehSampai).toBe("2026-09-10");
    expect(findRotationConflict("2026-09-10", list, tigaBulan)).toBeNull();
    expect(findRotationConflict("2026-09-11", list, tigaBulan)).not.toBeNull();
  });

  it("tidak menghitung jadwal itu sendiri saat diedit", () => {
    const list = collectPenampilan(narasumber, [jadwal("j1", "2026-11-16", "dijadwalkan")]);
    expect(findRotationConflict("2026-11-17", list, tigaBulan, ["jadwal-j1"])).toBeNull();
  });

  it("hanya menghitung jadwal berstatus dijadwalkan milik narasumber yang sama", () => {
    const list = collectPenampilan(narasumber, [
      jadwal("j1", "2026-11-16", "dibatalkan"),
      jadwal("j2", "2026-11-17", "ditunda"),
      jadwal("j3", "2026-11-18", "sudah-tampil"),
      jadwal("j4", "2026-11-19", "dijadwalkan", "n2"),
    ]);
    expect(list.map((p) => p.id)).toEqual(["r1"]);
    expect(findRotationConflict("2026-11-20", list, tigaBulan)).toBeNull();
  });

  it("tetap memakai lastAppearance bila riwayat kosong", () => {
    const list = collectPenampilan({ id: "n3", lastAppearance: "2026-10-01", riwayat: [] }, []);
    expect(findRotationConflict("2026-11-01", list, tigaBulan)).not.toBeNull();
    expect(findRotationConflict("2027-01-01", list, tigaBulan)).toBeNull();
  });

  it("menangani akhir bulan dan satuan hari", () => {
    const akhirBulan = [{ id: "a", tanggal: "2026-08-31", sumber: "riwayat" as const }];
    expect(findRotationConflict("2026-11-29", akhirBulan, tigaBulan)).not.toBeNull();
    expect(findRotationConflict("2026-11-30", akhirBulan, tigaBulan)).toBeNull();
    const harian = [{ id: "b", tanggal: "2026-11-01", sumber: "jadwal" as const }];
    expect(findRotationConflict("2026-11-07", harian, { value: 7, unit: "day" })).not.toBeNull();
    expect(findRotationConflict("2026-11-08", harian, { value: 7, unit: "day" })).toBeNull();
  });

  it("menghasilkan kalimat peringatan yang menyebut masa tunggu", () => {
    const list = collectPenampilan(narasumber, [jadwal("j1", "2026-11-16", "dijadwalkan")]);
    const conflict = findRotationConflict("2026-11-18", list, tigaBulan)!;
    const text = describeRotationConflict(conflict, tigaBulan);
    expect(text).toContain("sudah dijadwalkan");
    expect(text).toContain("3 Bulan");
  });
});
