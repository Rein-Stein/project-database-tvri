import { describe, expect, it } from "vitest";
import {
  addMonths,
  getCooldownEnd,
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
    expect(isJadwalSelesai({ tanggal: "2026-09-09", waktu: "10:00" }, new Date("2026-09-09T10:01:00"))).toBe(true);
    expect(isJadwalSelesai({ tanggal: "2026-09-09", waktu: "10:00" }, new Date("2026-09-09T09:59:00"))).toBe(false);
    expect(isJadwalSelesai({ tanggal: "2026-09-08" }, new Date("2026-09-09T00:00:00"))).toBe(true);
  });
});

describe("ekspor data", () => {
  it("meng-escape tanda kutip dan mempertahankan koma dalam CSV", () => {
    expect(escapeCsvCell('Dinas "Kaltim", Samarinda')).toBe('"Dinas ""Kaltim"", Samarinda"');
  });
});
