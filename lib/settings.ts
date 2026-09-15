import type { RowDataPacket } from "mysql2";
import pool from "@/lib/mysql";
import {
  DEFAULT_WAITING_PERIOD,
  normalizeWaitingPeriod,
  type WaitingPeriodSetting,
} from "@/types";

export async function getWaitingPeriodSettingFromDb(): Promise<WaitingPeriodSetting> {
  if (!process.env.DB_NAME) return DEFAULT_WAITING_PERIOD;

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT `key`, `value` FROM settings WHERE `key` IN (?, ?)",
      ["waiting_period_value", "waiting_period_unit"]
    );

    const map = new Map<string, string>((rows as RowDataPacket[]).map((row) => [String(row.key), String(row.value)]));
    const value = Number(map.get("waiting_period_value") ?? DEFAULT_WAITING_PERIOD.value);
    const unit = map.get("waiting_period_unit") === "day" ? "day" : "month";
    return normalizeWaitingPeriod({ value, unit });
  } catch {
    return DEFAULT_WAITING_PERIOD;
  }
}

export async function saveWaitingPeriodSettingInDb(
  setting: WaitingPeriodSetting,
  updatedBy?: string | null
): Promise<WaitingPeriodSetting> {
  const normalized = normalizeWaitingPeriod(setting);

  if (!process.env.DB_NAME) return normalized;

  try {
    await pool.query(
      "INSERT INTO settings (id, `key`, `value`, updated_by) VALUES ('setting-waiting-period', 'waiting_period_value', ?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), updated_by = VALUES(updated_by), updated_at = CURRENT_TIMESTAMP",
      [String(normalized.value), updatedBy ?? null]
    );
    await pool.query(
      "INSERT INTO settings (id, `key`, `value`, updated_by) VALUES ('setting-waiting-period-unit', 'waiting_period_unit', ?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), updated_by = VALUES(updated_by), updated_at = CURRENT_TIMESTAMP",
      [normalized.unit, updatedBy ?? null]
    );
    return normalized;
  } catch (error) {
    console.error("Gagal menyimpan pengaturan masa tunggu:", error);
    throw new Error("Pengaturan masa tunggu belum tersimpan ke database.");
  }
}
