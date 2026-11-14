import type { JadwalSiaran, LogAktivitas, Narasumber } from "@/types";

export interface DatabaseSnapshot {
  narasumber: Narasumber[];
  jadwal: JadwalSiaran[];
  log: LogAktivitas[];
}

export function validateSnapshot(value: unknown): string | null {
  if (!value || typeof value !== "object") return "Payload snapshot tidak valid.";
  const { narasumber, jadwal, log } = value as Record<string, unknown>;
  if (!Array.isArray(narasumber) || !Array.isArray(jadwal) || !Array.isArray(log)) {
    return "Snapshot harus berisi array narasumber, jadwal, dan log.";
  }
  for (const row of narasumber) {
    if (!row || typeof row !== "object") return "Data narasumber tidak valid.";
    const r = row as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.nama !== "string" || typeof r.bidang !== "string" || typeof r.instansi !== "string") {
      return "Setiap narasumber wajib memiliki id, nama, bidang, dan instansi berupa string.";
    }
    if (r.aturanJeda !== undefined && r.aturanJeda !== null && r.aturanJeda !== "semua_program" && r.aturanJeda !== "per_program") {
      return "Aturan jeda narasumber tidak valid.";
    }
    if (!Array.isArray(r.riwayat)) return "Riwayat narasumber harus berupa array.";
    for (const h of r.riwayat) {
      if (!h || typeof h !== "object") return "Data riwayat siaran tidak valid.";
      const hist = h as Record<string, unknown>;
      if (typeof hist.id !== "string" || typeof hist.tanggal !== "string" || typeof hist.program !== "string") {
        return "Setiap riwayat wajib memiliki id, tanggal, dan program berupa string.";
      }
      if (hist.programId !== undefined && hist.programId !== null && typeof hist.programId !== "string") {
        return "programId riwayat harus berupa string atau null.";
      }
    }
  }
  for (const row of jadwal) {
    if (!row || typeof row !== "object") return "Data jadwal tidak valid.";
    const j = row as Record<string, unknown>;
    if (typeof j.id !== "string" || typeof j.narasumberId !== "string" || typeof j.tanggal !== "string" || typeof j.program !== "string") {
      return "Setiap jadwal wajib memiliki id, narasumberId, tanggal, dan program berupa string.";
    }
    if (j.programId !== undefined && j.programId !== null && typeof j.programId !== "string") {
      return "programId jadwal harus berupa string atau null.";
    }
  }
  for (const row of log) {
    if (!row || typeof row !== "object") return "Data log tidak valid.";
    const l = row as Record<string, unknown>;
    if (typeof l.id !== "string" || typeof l.waktu !== "string" || typeof l.aktor !== "string" || typeof l.aksi !== "string") {
      return "Setiap log wajib memiliki id, waktu, aktor, dan aksi berupa string.";
    }
  }
  return null;
}

export function withSnapshotDefaults(snapshot: DatabaseSnapshot): DatabaseSnapshot {
  return {
    ...snapshot,
    narasumber: snapshot.narasumber.map((narasumber) => ({
      ...narasumber,
      aturanJeda: narasumber.aturanJeda ?? "semua_program",
      riwayat: narasumber.riwayat.map((riwayat) => ({
        ...riwayat,
        programId: riwayat.programId ?? null,
      })),
    })),
    jadwal: snapshot.jadwal.map((jadwal) => ({ ...jadwal, programId: jadwal.programId ?? null })),
  };
}

export async function loadDatabaseSnapshot(): Promise<DatabaseSnapshot | null> {
  const response = await fetch("/api/database", { cache: "no-store" });
  if (!response.ok) throw new Error("MySQL belum tersedia atau belum dikonfigurasi.");
  const data = await response.json();
  return data.snapshot ?? null;
}

export async function syncDatabaseSnapshot(snapshot: DatabaseSnapshot): Promise<void> {
  const response = await fetch("/api/database", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(snapshot),
  });
  if (!response.ok) throw new Error("Perubahan belum tersimpan ke MySQL.");
}
