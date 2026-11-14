import {
  collectPenampilan,
  getCooldownEnd,
  getLastAppearance,
  getNarasumberStatus,
  getRemainingDays,
  normalizeProgramName,
  toIsoDate,
  type JadwalSiaran,
  type Narasumber,
  type NarasumberStatus,
  type ProgramSiaran,
  type WaitingPeriodSetting,
} from "@/types";

export interface NarasumberStatusInfo {
  status: NarasumberStatus;
  label?: string;
  sisa?: number;
  bolehKembali?: string;
}

export function getNarasumberStatusInfo(
  narasumber: Narasumber,
  jadwalList: JadwalSiaran[],
  programList: ProgramSiaran[],
  setting: WaitingPeriodSetting
): NarasumberStatusInfo {
  if (narasumber.aturanJeda !== "per_program") {
    const last = getLastAppearance(narasumber, jadwalList);
    const end = getCooldownEnd(last, setting);
    const status = getNarasumberStatus(last, setting);
    return {
      status,
      sisa: status === "dalam-jeda" ? getRemainingDays(last, setting) : undefined,
      bolehKembali: end ? toIsoDate(end) : undefined,
    };
  }

  const groups: { programId?: string | null; nama: string; tanggalTerakhir: string }[] = [];
  for (const appearance of collectPenampilan(narasumber, jadwalList)) {
    const group = groups.find((candidate) => {
      if (candidate.programId && appearance.programId) return candidate.programId === appearance.programId;
      return normalizeProgramName(candidate.nama) === normalizeProgramName(appearance.program ?? "");
    });
    if (group) {
      if (appearance.tanggal > group.tanggalTerakhir) group.tanggalTerakhir = appearance.tanggal;
    } else {
      groups.push({
        programId: appearance.programId,
        nama: appearance.program ?? "",
        tanggalTerakhir: appearance.tanggal,
      });
    }
  }

  const today = toIsoDate(new Date());
  const activePrograms = groups.flatMap((group) => {
    const end = getCooldownEnd(group.tanggalTerakhir, setting);
    if (!end) return [];
    const endDate = toIsoDate(end);
    if (endDate <= today) return [];
    const program = programList.find((item) => item.id === group.programId)
      ?? programList.find((item) => normalizeProgramName(item.nama) === normalizeProgramName(group.nama));
    const nama = program?.nama ?? (group.nama || "Tanpa program");
    return [{ nama, endDate }];
  }).sort((a, b) => a.endDate.localeCompare(b.endDate) || a.nama.localeCompare(b.nama));

  if (activePrograms.length === 0) return { status: "tersedia", label: "Tersedia" };
  const label = `Dalam jeda di: ${activePrograms
    .map((item) => `${item.nama} (sampai ${formatShortDate(item.endDate)})`)
    .join(", ")}`;
  const firstReturn = activePrograms[0].endDate;
  const sisa = Math.max(0, Math.round(
    (new Date(`${firstReturn}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000
  ));
  return { status: "dalam-jeda", label, sisa, bolehKembali: firstReturn };
}

function formatShortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function statusFilterMatches(
  narasumber: Narasumber,
  jadwalList: JadwalSiaran[],
  programList: ProgramSiaran[],
  setting: WaitingPeriodSetting,
  status: NarasumberStatus
): boolean {
  return getNarasumberStatusInfo(narasumber, jadwalList, programList, setting).status === status;
}
