import { describe, expect, it, vi } from "vitest";
import {
  addMonths,
  collectPenampilan,
  findRotationConflict,
  getCooldownEnd,
  getLastAppearance,
  getNarasumberStatus,
  getRemainingDays,
  isJadwalSelesai,
} from "@/types";
import { escapeCsvCell } from "@/lib/utils";

describe("aturan jeda narasumber", () => {
  it("menambah tiga bulan kalender dan menangani akhir bulan", () => {
    const endOfMonth = addMonths("2026-08-31", 3);
    const ordinary = getCooldownEnd("2026-05-10");
    expect([endOfMonth.getFullYear(), endOfMonth.getMonth() + 1, endOfMonth.getDate()]).toEqual([2026, 11, 30]);
    expect([ordinary?.getFullYear(), (ordinary?.getMonth() ?? 0) + 1, ordinary?.getDate()]).toEqual([2026, 8, 10]);
  });

  it("menerapkan pengaturan masa tunggu yang relatif dan bisa dikustomisasi", () => {
    const customDays = getCooldownEnd("2026-08-10", { value: 45, unit: "day" });
    const customMonths = getCooldownEnd("2026-08-10", { value: 2, unit: "month" });

    expect([customDays?.getFullYear(), (customDays?.getMonth() ?? 0) + 1, customDays?.getDate()]).toEqual([2026, 9, 24]);
    expect([customMonths?.getFullYear(), (customMonths?.getMonth() ?? 0) + 1, customMonths?.getDate()]).toEqual([2026, 10, 10]);
    // Gunakan tanggal yang relatif terhadap hari ini agar tidak rapuh terhadap pergeseran waktu.
    // Format ISO lokal (bukan toISOString, yang memakai UTC dan bisa mundur sehari di zona +08:00).
    const localIso = (d: Date) =>
      [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    expect(getNarasumberStatus(localIso(yesterday), { value: 2, unit: "day" })).toBe("dalam-jeda");
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(now.getDate() - 3);
    expect(getNarasumberStatus(localIso(threeDaysAgo), { value: 2, unit: "day" })).toBe("tersedia");
    expect(getRemainingDays(null, { value: 30, unit: "day" })).toBe(0);
  });

  it("membedakan status belum tampil dan dalam masa tunggu", () => {
    expect(getNarasumberStatus(null)).toBe("belum-tampil");
    expect(getRemainingDays(null)).toBe(0);
  });

  it("menentukan jadwal selesai setelah waktu tayang lewat", () => {
    expect(isJadwalSelesai({ tanggal: "2026-09-09", waktu: "10:00" }, new Date("2026-09-09T10:01:00+08:00"))).toBe(true);
    expect(isJadwalSelesai({ tanggal: "2026-09-09", waktu: "10:00" }, new Date("2026-09-09T09:59:00+08:00"))).toBe(false);
    expect(isJadwalSelesai({ tanggal: "2026-09-08" }, new Date("2026-09-09T00:00:00+08:00"))).toBe(true);
  });

  it("menghitung bentrok jadwal dua arah dengan masa tunggu hari", () => {
    const narasumber = { id: "n1", lastAppearance: null, riwayat: [] };
    const schedules = [{
      id: "j1", narasumberId: "n1", tanggal: "2026-11-17", program: "Dialog Pagi", status: "dijadwalkan" as const,
    }];
    const appearances = collectPenampilan(narasumber, schedules);
    const fiveDays = { value: 5, unit: "day" as const };

    for (const date of ["2026-11-14", "2026-11-13", "2026-11-21", "2026-11-17"]) {
      expect(findRotationConflict(date, appearances, fiveDays), date).not.toBeNull();
    }
    for (const date of ["2026-11-12", "2026-11-22"]) {
      expect(findRotationConflict(date, appearances, fiveDays), date).toBeNull();
    }
    expect(findRotationConflict("2026-11-14", collectPenampilan(
      { ...narasumber, id: "n2" },
      schedules
    ), fiveDays)).toBeNull();
  });

  it("menggunakan masa tunggu bulan dan mengecualikan jadwal yang diedit", () => {
    const narasumber = {
      id: "n1",
      lastAppearance: null,
      riwayat: [],
    };
    const appearances = collectPenampilan(narasumber, [{
      id: "j1", narasumberId: "n1", tanggal: "2026-11-16", program: "Dialog Pagi", status: "dijadwalkan",
    }]);
    const threeMonths = { value: 3, unit: "month" as const };
    expect(findRotationConflict("2026-11-18", appearances, threeMonths)).not.toBeNull();
    expect(findRotationConflict("2027-02-15", appearances, threeMonths)).not.toBeNull();
    expect(findRotationConflict("2027-02-16", appearances, threeMonths)).toBeNull();
    expect(findRotationConflict("2026-11-18", appearances, threeMonths, ["jadwal-j1"])).toBeNull();
  });

  it("mengabaikan jadwal dibatalkan atau ditunda dan menghitung status dari jadwal mendatang", () => {
    const narasumber = { id: "n1", lastAppearance: null, riwayat: [] };
    const appearances = collectPenampilan(narasumber, [
      { id: "j1", narasumberId: "n1", tanggal: "2026-12-01", program: "Batal", status: "dibatalkan" },
      { id: "j2", narasumberId: "n1", tanggal: "2026-12-02", program: "Tunda", status: "ditunda" },
    ]);
    expect(appearances).toHaveLength(0);
    expect(getLastAppearance(narasumber, [
      { id: "j3", narasumberId: "n1", tanggal: "2026-11-17", status: "dijadwalkan" },
    ])).toBe("2026-11-17");
  });

  it("menghitung ulang status sesuai masa tunggu yang baru", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-12T12:00:00"));
    try {
      expect(getNarasumberStatus("2026-11-07", { value: 3, unit: "month" })).toBe("dalam-jeda");
      expect(getNarasumberStatus("2026-11-07", { value: 5, unit: "day" })).toBe("tersedia");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("ekspor data", () => {
  it("meng-escape tanda kutip dan mempertahankan koma dalam CSV", () => {
    expect(escapeCsvCell('Dinas "Kaltim", Samarinda')).toBe('"Dinas ""Kaltim"", Samarinda"');
  });
});
