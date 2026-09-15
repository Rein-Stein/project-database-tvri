import type { JadwalSiaran, LogAktivitas, Narasumber } from "@/types";

export interface DatabaseSnapshot {
  narasumber: Narasumber[];
  jadwal: JadwalSiaran[];
  log: LogAktivitas[];
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
