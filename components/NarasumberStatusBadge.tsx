"use client";

import { getNarasumberStatusInfo } from "@/lib/narasumber-status";
import type { JadwalSiaran, Narasumber, ProgramSiaran, WaitingPeriodSetting } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";

export function NarasumberStatusBadge({
  narasumber,
  jadwalList,
  programList,
  waitingPeriod,
}: {
  narasumber: Narasumber;
  jadwalList: JadwalSiaran[];
  programList: ProgramSiaran[];
  waitingPeriod: WaitingPeriodSetting;
}) {
  const info = getNarasumberStatusInfo(narasumber, jadwalList, programList, waitingPeriod);
  return <StatusBadge status={info.status} sisa={info.sisa} label={info.label} />;
}
