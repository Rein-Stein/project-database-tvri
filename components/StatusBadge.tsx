"use client";

import { cn } from "@/lib/utils";
import { STATUS_LABEL, type NarasumberStatus } from "@/types";

const statusBadge: Record<NarasumberStatus, string> = {
  "tersedia": "bg-[var(--success-muted)] text-[var(--success)] border-transparent",
  "dalam-jeda": "bg-[var(--warning-muted)] text-[var(--warning)] border-transparent",
  "belum-tampil": "bg-[var(--muted)] text-[var(--muted-foreground)] border-transparent",
};

export function StatusBadge({ status, sisa, label }: { status: NarasumberStatus; sisa?: number; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 text-[11px] font-medium rounded-[3px] whitespace-nowrap",
        statusBadge[status]
      )}
    >
      {label ?? (status === "dalam-jeda" && sisa != null
        ? `${STATUS_LABEL[status]} · ${sisa} hr`
        : STATUS_LABEL[status])}
    </span>
  );
}
