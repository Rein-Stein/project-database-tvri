import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import {
  collectPenampilan,
  describeRotationConflict,
  findRotationConflict,
  normalizeWaitingPeriod,
  type RiwayatSiaran,
  type AturanJeda,
  type WaitingPeriodSetting,
} from "@/types";

interface AppearanceRow extends RowDataPacket {
  sumber: "riwayat" | "jadwal";
  id: string;
  tanggal: string;
  program: string | null;
  program_id: string | null;
}

interface NarasumberRuleRow extends RowDataPacket {
  aturan_jeda: AturanJeda | null;
}

interface SettingRow extends RowDataPacket {
  key: string;
  value: string;
}

export async function findDatabaseRotationConflict(
  connection: PoolConnection,
  narasumberId: string,
  lastAppearance: string | null,
  tanggal: string,
  excludeScheduleId?: string,
  programId?: string | null,
  programNama?: string | null
): Promise<string | null> {
  const [rows] = await connection.query<AppearanceRow[]>(
    `SELECT 'riwayat' AS sumber, id, DATE_FORMAT(tanggal, '%Y-%m-%d') AS tanggal, program, program_id
     FROM riwayat_siaran WHERE narasumber_id = ?
     UNION ALL
     SELECT 'jadwal' AS sumber, id, DATE_FORMAT(tanggal, '%Y-%m-%d') AS tanggal, program, program_id
     FROM jadwal_siaran WHERE narasumber_id = ? AND status = 'dijadwalkan'`,
    [narasumberId, narasumberId]
  );
  const [narasumberRows] = await connection.query<NarasumberRuleRow[]>(
    "SELECT aturan_jeda FROM narasumber WHERE id = ?",
    [narasumberId]
  );
  const [settingRows] = await connection.query<SettingRow[]>(
    "SELECT `key`, `value` FROM settings WHERE `key` IN (?, ?)",
    ["waiting_period_value", "waiting_period_unit"]
  );

  const settingMap = new Map(settingRows.map((row) => [row.key, row.value]));
  const setting: WaitingPeriodSetting = normalizeWaitingPeriod({
    value: Number(settingMap.get("waiting_period_value")),
    unit: settingMap.get("waiting_period_unit") === "day" ? "day" : "month",
  });
  const riwayat: RiwayatSiaran[] = rows
    .filter((row) => row.sumber === "riwayat")
    .map((row) => ({
      id: row.id,
      tanggal: row.tanggal,
      program: row.program ?? "",
      programId: row.program_id,
    }));
  const schedules = rows
    .filter((row) => row.sumber === "jadwal")
    .map((row) => ({
      id: row.id,
      narasumberId,
      tanggal: row.tanggal,
      program: row.program ?? "",
      programId: row.program_id,
      status: "dijadwalkan" as const,
    }));
  const appearances = collectPenampilan(
    { id: narasumberId, riwayat, lastAppearance },
    schedules
  );
  const excludeIds = excludeScheduleId ? [`jadwal-${excludeScheduleId}`] : [];
  const aturanJeda: AturanJeda = narasumberRows[0]?.aturan_jeda === "per_program" ? "per_program" : "semua_program";
  const conflict = findRotationConflict(tanggal, appearances, setting, excludeIds, {
    aturanJeda,
    programId,
    programNama,
  });
  return conflict ? describeRotationConflict(conflict, setting) : null;
}
