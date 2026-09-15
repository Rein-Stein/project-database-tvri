"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { JADWAL_LABEL, type JadwalStatus } from "@/types";

const adminNav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/narasumber", label: "Narasumber" },
  { href: "/admin/jadwal", label: "Jadwal Siaran" },
  { href: "/admin/kalender", label: "Kalender" },
  { href: "/admin/laporan", label: "Laporan" },
  { href: "/admin/users/login", label: "Manajemen Akun" },
  { href: "/admin/settings", label: "Pengaturan" },
];

export function AdminSubNav() {
  const pathname = usePathname();
  return (
    <nav
      className="scrollbar-hide mb-6 flex gap-5 overflow-x-auto border-b border-[var(--border)]"
      aria-label="Navigasi admin"
    >
      {adminNav.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "border-b-2 px-0 py-3 text-[13px] font-semibold transition-colors whitespace-nowrap",
              active
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--muted-foreground)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function StatCard({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="border-l-2 border-[var(--accent)] bg-[var(--card)] px-4 py-3">
      <p className="text-[12px] font-medium text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-2 text-[26px] font-semibold tracking-tight text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

const jadwalBadge: Record<JadwalStatus, string> = {
  dijadwalkan: "bg-[var(--accent-muted)] text-[var(--accent)]",
  "sudah-tampil": "bg-[var(--success-muted)] text-[var(--success)]",
  dibatalkan: "bg-[var(--danger-muted)] text-[var(--danger)]",
  ditunda: "bg-[var(--muted)] text-[var(--muted-foreground)]",
};

export function JadwalBadge({ status }: { status: JadwalStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 text-[11px] font-medium rounded-[3px] whitespace-nowrap",
        jadwalBadge[status]
      )}
    >
      {JADWAL_LABEL[status]}
    </span>
  );
}

export function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-[var(--foreground)]">
        {label} {required && <span className="text-[var(--danger)]">*</span>}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  "field-input focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-muted)]";

export const textareaClass =
  "field-textarea focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-muted)]";
