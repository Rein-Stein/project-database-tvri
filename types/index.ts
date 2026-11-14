export type UserRole = "admin" | "operator";

export type ChangeRequestStatus = "pending" | "approved" | "rejected";
export type AturanJeda = "semua_program" | "per_program";

export interface ProgramSiaran {
  id: string;
  nama: string;
  aktif: boolean;
}

export interface NarasumberChangeData {
  nama: string;
  bidang: string;
  instansi: string;
  jabatan: string;
  phone: string;
}

export interface JadwalChangeData {
  narasumberId: string;
  tanggal: string;
  waktu: string;
  program: string;
  programId: string | null;
  jenisSiaran: JenisSiaran;
  topik: string;
  catatan: string;
  status: JadwalStatus;
  tanggalBaru: string;
}

export type ChangeRequestEntityType = "narasumber" | "narasumber_create" | "narasumber_update" | "jadwal_siaran_create" | "jadwal_siaran_update";
export type ChangeRequestData = Partial<NarasumberChangeData & JadwalChangeData>;

export interface ChangeRequest {
  id: string;
  entityType: ChangeRequestEntityType;
  entityId: string;
  operatorId: string;
  operatorName: string;
  dataLama: ChangeRequestData;
  dataBaru: ChangeRequestData;
  status: ChangeRequestStatus;
  alasanPenolakan?: string;
  reviewedBy?: string;
  reviewerName?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

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
  /** Jadwal sumber jika riwayat berasal dari siaran yang terjadwal. */
  jadwalId?: string;
  /** ISO date string (YYYY-MM-DD) */
  tanggal: string;
  /** HH:mm, opsional */
  waktu?: string;
  program: string;
  programId?: string | null;
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
  programId?: string | null;
  jenisSiaran?: JenisSiaran;
  topik?: string;
  catatan?: string;
  status: JadwalStatus;
  /** Tanggal baru jika status = ditunda */
  tanggalBaru?: string;
}

/** Menentukan apakah jadwal sudah melewati tanggal dan jam tayangnya. */
export function isJadwalSelesai(jadwal: Pick<JadwalSiaran, "tanggal" | "waktu">, now: Date = new Date()): boolean {
  const scheduledAt = new Date(`${jadwal.tanggal}T${jadwal.waktu || "23:59"}:00+08:00`);
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
  aturanJeda?: AturanJeda;
}

/** Fungsi pusat rotasi: terakhir tampil = tanggal siaran terbaru dari riwayat */
export function getLastAppearance(
  n: Pick<Narasumber, "id" | "riwayat" | "lastAppearance">,
  jadwalList: Pick<JadwalSiaran, "id" | "narasumberId" | "tanggal" | "status">[] = []
): string | null {
  const dates = (n.riwayat || []).map((r) => r.tanggal.slice(0, 10));
  if (dates.length === 0 && n.lastAppearance) dates.push(n.lastAppearance.slice(0, 10));
  for (const jadwal of jadwalList) {
    if (jadwal.narasumberId === n.id && jadwal.status === "dijadwalkan") {
      dates.push(jadwal.tanggal.slice(0, 10));
    }
  }
  dates.sort();
  return dates.length > 0 ? dates[dates.length - 1] : null;
}

export interface Penampilan {
  id: string;
  tanggal: string;
  sumber: "riwayat" | "jadwal";
  program?: string;
  programId?: string | null;
}

export interface RotationConflict {
  penampilan: Penampilan;
  arah: "sesudah" | "sebelum";
  bolehMulai: string;
  bolehSampai?: string;
  tanggalDipilih?: string;
  aturanJeda?: AturanJeda;
  programNama?: string | null;
}

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function normalizeProgramName(nama: string): string {
  return nama.trim().replace(/\s+/g, " ").toLowerCase();
}

export function collectPenampilan(
  narasumber: Pick<Narasumber, "id" | "riwayat" | "lastAppearance">,
  jadwalList: Pick<JadwalSiaran, "id" | "narasumberId" | "tanggal" | "program" | "programId" | "status">[]
): Penampilan[] {
  const penampilan: Penampilan[] = (narasumber.riwayat || []).map((riwayat) => ({
    id: riwayat.id,
    tanggal: riwayat.tanggal.slice(0, 10),
    sumber: "riwayat",
    program: riwayat.program,
    programId: riwayat.programId,
  }));
  if (penampilan.length === 0 && narasumber.lastAppearance) {
    penampilan.push({
      id: `terakhir-${narasumber.id}`,
      tanggal: narasumber.lastAppearance.slice(0, 10),
      sumber: "riwayat",
    });
  }
  for (const jadwal of jadwalList) {
    if (jadwal.narasumberId === narasumber.id && jadwal.status === "dijadwalkan") {
      penampilan.push({
        id: `jadwal-${jadwal.id}`,
        tanggal: jadwal.tanggal.slice(0, 10),
        sumber: "jadwal",
        program: jadwal.program,
        programId: jadwal.programId,
      });
    }
  }
  return penampilan;
}

export function findRotationConflict(
  tanggal: string,
  penampilan: Penampilan[],
  setting: WaitingPeriodSetting | undefined = undefined,
  excludeIds: string[] = [],
  opsi?: { aturanJeda?: AturanJeda; programId?: string | null; programNama?: string | null }
): RotationConflict | null {
  const { value, unit } = normalizeWaitingPeriod(setting ?? getCurrentWaitingPeriodSetting());
  const target = tanggal.slice(0, 10);
  if (!target) return null;
  const targetEnd = toIsoDate(addCalendarOffset(target, value, unit));
  const targetTime = new Date(`${target}T00:00:00`).getTime();
  let nearest: Penampilan | null = null;
  let nearestGap = Infinity;

  for (const item of penampilan) {
    if (excludeIds.includes(item.id)) continue;
    if (opsi?.aturanJeda === "per_program") {
      const samaProgram = opsi.programId && item.programId
        ? opsi.programId === item.programId
        : normalizeProgramName(opsi.programNama ?? "") === normalizeProgramName(item.program ?? "");
      if (!samaProgram) continue;
    }
    const otherDate = item.tanggal.slice(0, 10);
    const otherEnd = toIsoDate(addCalendarOffset(otherDate, value, unit));
    if (target < otherEnd && otherDate < targetEnd) {
      const gap = Math.abs(new Date(`${otherDate}T00:00:00`).getTime() - targetTime);
      if (gap < nearestGap) {
        nearest = item;
        nearestGap = gap;
      }
    }
  }

  if (!nearest) return null;
  const otherDate = nearest.tanggal.slice(0, 10);
  const bolehMulai = toIsoDate(addCalendarOffset(otherDate, value, unit));
  const conflictOptions = opsi?.aturanJeda === "per_program"
    ? { tanggalDipilih: target, aturanJeda: opsi.aturanJeda, programNama: opsi.programNama }
    : {};
  if (otherDate <= target) return { penampilan: nearest, arah: "sesudah", bolehMulai, ...conflictOptions };

  let bolehSampaiDate = addCalendarOffset(otherDate, -value, unit);
  while (toIsoDate(addCalendarOffset(toIsoDate(bolehSampaiDate), value, unit)) > otherDate) {
    bolehSampaiDate.setDate(bolehSampaiDate.getDate() - 1);
  }
  for (;;) {
    const next = new Date(bolehSampaiDate);
    next.setDate(next.getDate() + 1);
    if (toIsoDate(addCalendarOffset(toIsoDate(next), value, unit)) <= otherDate) {
      bolehSampaiDate = next;
    } else {
      break;
    }
  }
  return {
    penampilan: nearest,
    arah: "sebelum",
    bolehMulai,
    bolehSampai: toIsoDate(bolehSampaiDate),
    ...conflictOptions,
  };
}

export function describeRotationConflict(
  conflict: RotationConflict,
  setting: WaitingPeriodSetting | undefined = undefined,
  namaNarasumber?: string
): string {
  const normalized = normalizeWaitingPeriod(setting ?? getCurrentWaitingPeriodSetting());
  const item = conflict.penampilan;
  if (conflict.aturanJeda === "per_program") {
    const narasumber = namaNarasumber || "Narasumber ini";
    const program = conflict.programNama ?? item.program ?? "tanpa program";
    if (conflict.arah === "sesudah") {
      const selectedDate = new Date(`${conflict.tanggalDipilih}T00:00:00`);
      const returnDate = new Date(`${conflict.bolehMulai}T00:00:00`);
      const daysRemaining = Math.max(0, Math.round((returnDate.getTime() - selectedDate.getTime()) / 86400000));
      return `${narasumber} sedang dalam masa tunggu untuk program ${program}, ${daysRemaining} hari lagi (boleh kembali ${formatDate(conflict.bolehMulai)}). Silakan pilih program lain, atau pilih tanggal mulai ${formatDate(conflict.bolehMulai)}.`;
    }
    return `${narasumber} memiliki jadwal untuk program ${program} pada ${formatDate(item.tanggal)}, terlalu dekat dengan tanggal yang dipilih. Pilih tanggal paling lambat ${formatDate(conflict.bolehSampai ?? null)} atau program lain.`;
  }
  const source = item.sumber === "jadwal" ? "sudah dijadwalkan" : "pernah tampil";
  const program = item.program ? ` (${item.program})` : "";
  const period = formatWaitingPeriod(normalized);
  if (conflict.arah === "sesudah") {
    return `Narasumber ini ${source} pada ${formatDate(item.tanggal)}${program}. Masa tunggu ${period}, jadi baru boleh dijadwalkan mulai ${formatDate(conflict.bolehMulai)}.`;
  }
  return `Narasumber ini ${source} pada ${formatDate(item.tanggal)}${program}, terlalu dekat dengan tanggal yang dipilih. Masa tunggu ${period}: pilih tanggal paling lambat ${formatDate(conflict.bolehSampai ?? null)} atau mulai ${formatDate(conflict.bolehMulai)}.`;
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

