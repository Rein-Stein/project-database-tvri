import { afterEach, describe, expect, it, vi } from "vitest";
import { getNarasumberStatusInfo } from "@/lib/narasumber-status";
import type { JadwalSiaran, Narasumber } from "@/types";

describe("status jeda per program", () => {
  const waitingPeriod = { value: 5, unit: "day" as const };
  const jadwal: JadwalSiaran[] = [];

  afterEach(() => {
    vi.useRealTimers();
  });

  it("menampilkan nama program dan tanggal selesai, lalu Tersedia jika semua jeda berakhir", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-12T12:00:00"));
    const narasumber: Narasumber = {
      id: "n1",
      nama: "Budi",
      bidang: "Pendidikan",
      instansi: "Dinas Pendidikan",
      lastAppearance: null,
      aturanJeda: "per_program",
      riwayat: [
        { id: "r1", tanggal: "2026-11-10", program: "Dialog Pagi", programId: "p1" },
        { id: "r2", tanggal: "2026-11-05", program: "Berita Kaltim", programId: "p2" },
      ],
    };

    expect(getNarasumberStatusInfo(narasumber, jadwal, [
      { id: "p1", nama: "Dialog Pagi", aktif: true },
      { id: "p2", nama: "Berita Kaltim", aktif: true },
    ], waitingPeriod)).toEqual({
      status: "dalam-jeda",
      label: "Dalam jeda di: Dialog Pagi (sampai 15 Nov)",
      sisa: 3,
      bolehKembali: "2026-11-15",
    });

    vi.setSystemTime(new Date("2026-11-16T12:00:00"));
    expect(getNarasumberStatusInfo(narasumber, jadwal, [], waitingPeriod)).toEqual({
      status: "tersedia",
      label: "Tersedia",
    });
  });

  it("mempertahankan status gabungan lama untuk aturan semua program", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-12T12:00:00"));
    const narasumber: Narasumber = {
      id: "n1",
      nama: "Budi",
      bidang: "Pendidikan",
      instansi: "Dinas Pendidikan",
      lastAppearance: null,
      riwayat: [{ id: "r1", tanggal: "2026-11-10", program: "Dialog Pagi" }],
    };
    expect(getNarasumberStatusInfo(narasumber, jadwal, [], waitingPeriod).status).toBe("dalam-jeda");
    expect(getNarasumberStatusInfo(narasumber, jadwal, [], waitingPeriod).label).toBeUndefined();
  });
});
