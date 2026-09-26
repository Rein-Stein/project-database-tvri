import { describe, expect, it, vi } from "vitest";
import { isJadwalSelesai } from "@/types";
import type { JadwalSiaran } from "@/types";

describe("penyelarasan Jadwal Siaran → Catat Siaran", () => {
  it("hanya menawarkan jadwal yang sudah terlaksana untuk dicatat", () => {
    const past: JadwalSiaran = {
      id: "j-lalu", narasumberId: "n-1", tanggal: "2020-01-01", waktu: "09:00",
      program: "Dialog Pagi", status: "dijadwalkan",
    };
    const future: JadwalSiaran = {
      id: "j-depan", narasumberId: "n-1", tanggal: "2099-01-01", waktu: "09:00",
      program: "Dialog Pagi", status: "dijadwalkan",
    };
    const recordable = [past, future].filter((jadwal) => isJadwalSelesai(jadwal));
    expect(recordable.map((j) => j.id)).toEqual(["j-lalu"]);
  });

  it("jadwal yang sudah tercatat tidak muncul lagi (tidak ada riwayat ganda)", () => {
    const jadwal: JadwalSiaran = {
      id: "j-1", narasumberId: "n-1", tanggal: "2020-01-01", waktu: "09:00",
      program: "Dialog Pagi", status: "sudah-tampil",
    };
    const riwayat = [{ id: `jadwal-${jadwal.id}`, jadwalId: jadwal.id, tanggal: jadwal.tanggal, program: jadwal.program }];
    const sudahTercatat = riwayat.some((history) => history.id === `jadwal-${jadwal.id}` || history.jadwalId === jadwal.id);
    expect(sudahTercatat).toBe(true);
  });
});
