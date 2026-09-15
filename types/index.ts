export type UserRole = "admin" | "operator";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export type WaitingPeriodUnit = "day" | "month";

export interface WaitingPeriodSetting {
  value: number;
  unit: WaitingPeriodUnit;
}

export const DEFAULT_WAITING_PERIOD: WaitingPeriodSetting = {
  value: 3,
  unit: "month",
};

/**
 * Masa tunggu aktif di sisi client BUKAN disimpan di localStorage.
 * Nilai diambil dari MySQL (tabel settings) via /api/settings lalu di-set
 * oleh WaitingPeriodSync di NarasumberProvider. Default dipakai hanya
 * sebelum data dari server tiba.
 */
let clientWaitingPeriod: WaitingPeriodSetting | null = null;

export function getCurrentWaitingPeriodSetting(): WaitingPeriodSetting {
  return clientWaitingPeriod ?? DEFAULT_WAITING_PERIOD;
}

export function setClientWaitingPeriod(setting: Partial<WaitingPeriodSetting>): WaitingPeriodSetting {
  clientWaitingPeriod = normalizeWaitingPeriod(setting);
  return clientWaitingPeriod;
}

export function normalizeWaitingPeriod(setting?: Partial<WaitingPeriodSetting>): WaitingPeriodSetting {
  const raw = Number(setting?.value ?? DEFAULT_WAITING_PERIOD.value);
  const unit = setting?.unit === "day" ? "day" : "month";
  // Batasi 1..365 agar input custom tidak menghasilkan nilai tidak masuk akal
  const value = Number.isFinite(raw) && raw > 0 ? Math.min(365, Math.floor(raw)) : DEFAULT_WAITING_PERIOD.value;
  return { value, unit };
}

export function formatWaitingPeriod(setting: WaitingPeriodSetting = DEFAULT_WAITING_PERIOD): string {
  const suffix = setting.unit === "day" ? "Hari" : "Bulan";
  return `${setting.value} ${suffix}`;
}

/** Status kelayakan narasumber (rotasi kalender relatif yang bisa dikonfigurasi) */
export type NarasumberStatus = "tersedia" | "dalam-jeda" | "belum-tampil";

export type JenisSiaran = "live" | "rekaman";

export const JENIS_SIARAN_LABEL: Record<JenisSiaran, string> = {
  live: "Live",
  rekaman: "Rekaman",
};

/** Satu record riwayat siaran. Riwayat LAMA TIDAK ditimpa — setiap siaran = record baru. */
export interface RiwayatSiaran {
  id: string;
  /** ISO date string (YYYY-MM-DD) */
  tanggal: string;
  /** HH:mm, opsional */
  waktu?: string;
  program: string;
  jenisSiaran?: JenisSiaran;
  topik?: string;
  catatan?: string;
}

export type JadwalStatus = "dijadwalkan" | "sudah-tampil" | "dibatalkan" | "ditunda";

export interface JadwalSiaran {
  id: string;
  narasumberId: string;
  /** ISO date string (YYYY-MM-DD) */
  tanggal: string;
  /** HH:mm, opsional */
  waktu?: string;
  program: string;
  jenisSiaran?: JenisSiaran;
  topik?: string;
  catatan?: string;
  status: JadwalStatus;
  /** Tanggal baru jika status = ditunda */
  tanggalBaru?: string;
}

/** Menentukan apakah jadwal sudah melewati tanggal dan jam tayangnya. */
export function isJadwalSelesai(jadwal: Pick<JadwalSiaran, "tanggal" | "waktu">, now: Date = new Date()): boolean {
  const scheduledAt = new Date(`${jadwal.tanggal}T${jadwal.waktu || "23:59"}:00`);
  return scheduledAt.getTime() <= now.getTime();
}

export interface LogAktivitas {
  id: string;
  /** ISO datetime */
  waktu: string;
  aktor: string;
  aksi: string;
  detail?: string;
}

export interface Narasumber {
  id: string;
  nama: string;
  bidang: string;
  instansi: string;
  /** Tanggal terakhir mengikuti siaran (ISO string), dihitung dari riwayat, null jika belum pernah */
  lastAppearance: string | null;
  /** Riwayat kehadiran siaran — bisa banyak record */
  riwayat: RiwayatSiaran[];
  phone?: string;
  jabatan?: string;
}

/** Fungsi pusat rotasi: terakhir tampil = tanggal siaran terbaru dari riwayat */
export function getLastAppearance(n: Pick<Narasumber, "riwayat" | "lastAppearance">): string | null {
  const dates = (n.riwayat || []).map((r) => r.tanggal).sort();
  return dates.length > 0 ? dates[dates.length - 1] : (n.lastAppearance ?? null);
}

/** Tanggal boleh diundang kembali = terakhir tampil + masa tunggu yang dikonfigurasi.
 * Menangani akhir bulan dan kalender yang berbeda. */
export function addMonths(iso: string, months: number): Date {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // Jika overflow bulan (mis. 31 Okt + 1 bln → 1 Des), mundur ke akhir bulan sebelumnya
  if (d.getDate() < day) d.setDate(0);
  return d;
}

export function addDays(iso: string, days: number): Date {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d;
}

export function addCalendarOffset(iso: string, value: number, unit: WaitingPeriodUnit): Date {
  return unit === "month" ? addMonths(iso, value) : addDays(iso, value);
}

export function getCooldownEnd(
  lastAppearance: string | null,
  setting: WaitingPeriodSetting | undefined = undefined
): Date | null {
  if (!lastAppearance) return null;
  const normalized = normalizeWaitingPeriod(setting ?? getCurrentWaitingPeriodSetting());
  const iso = lastAppearance.length > 10 ? lastAppearance.slice(0, 10) : lastAppearance;
  return addCalendarOffset(iso, normalized.value, normalized.unit);
}

export function getNarasumberStatus(
  lastAppearance: string | null,
  setting: WaitingPeriodSetting | undefined = undefined
): NarasumberStatus {
  if (!lastAppearance) return "belum-tampil";
  const end = getCooldownEnd(lastAppearance, setting)!;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return end.getTime() > today.getTime() ? "dalam-jeda" : "tersedia";
}

export function getRemainingDays(
  lastAppearance: string | null,
  setting: WaitingPeriodSetting | undefined = undefined
): number {
  const end = getCooldownEnd(lastAppearance, setting);
  if (!end) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((end.getTime() - today.getTime()) / 86400000));
}

export const STATUS_LABEL: Record<NarasumberStatus, string> = {
  "tersedia": "Boleh Diundang Kembali",
  "dalam-jeda": "Dalam Masa Tunggu",
  "belum-tampil": "Belum Pernah Tampil",
};

export const JADWAL_LABEL: Record<JadwalStatus, string> = {
  "dijadwalkan": "Dijadwalkan",
  "sudah-tampil": "Sudah Tampil",
  "dibatalkan": "Dibatalkan",
  "ditunda": "Ditunda",
};

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = iso.length > 10 ? new Date(iso) : new Date(iso + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

