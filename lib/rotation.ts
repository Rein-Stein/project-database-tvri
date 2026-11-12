import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import {
  collectPenampilan,
  describeRotationConflict,
  findRotationConflict,
  normalizeWaitingPeriod,
  type RiwayatSiaran,
  type WaitingPeriodSetting,
} from "@/types";

interface AppearanceRow extends RowDataPacket {
  sumber: "riwayat" | "jadwal";
  id: string;
  tanggal: string;
  program: string | null;
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
  excludeScheduleId?: string
): Promise<string | null> {
  const [rows] = await connection.query<AppearanceRow[]>(
    `SELECT 'riwayat' AS sumber, id, DATE_FORMAT(tanggal, '%Y-%m-%d') AS tanggal, program
     FROM riwayat_siaran WHERE narasumber_id = ?
     UNION ALL
     SELECT 'jadwal' AS sumber, id, DATE_FORMAT(tanggal, '%Y-%m-%d') AS tanggal, program
     FROM jadwal_siaran WHERE narasumber_id = ? AND status = 'dijadwalkan'`,
    [narasumberId, narasumberId]
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
    }));
  const schedules = rows
    .filter((row) => row.sumber === "jadwal")
    .map((row) => ({
      id: row.id,
      narasumberId,
      tanggal: row.tanggal,
      program: row.program ?? "",
      status: "dijadwalkan" as const,
    }));
  const appearances = collectPenampilan(
    { id: narasumberId, riwayat, lastAppearance },
    schedules
  );
  const excludeIds = excludeScheduleId ? [`jadwal-${excludeScheduleId}`] : [];
  const conflict = findRotationConflict(tanggal, appearances, setting, excludeIds);
  return conflict ? describeRotationConflict(conflict, setting) : null;
}
