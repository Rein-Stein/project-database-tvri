"use client";

import { useNarasumber } from "@/context/NarasumberContext";

export function DatabaseStatus() {
  const { databaseStatus } = useNarasumber();
  if (databaseStatus === "ready") return null;

  const message = databaseStatus === "loading"
    ? "Memuat data dari database..."
    : databaseStatus === "fallback"
    ? "Database tidak tersedia. Menampilkan data development lokal."
    : "Data database tidak dapat dimuat. Tidak ada data dummy yang digunakan di production.";

  return (
    <div className="mx-auto max-w-6xl px-6 pt-5 sm:px-8" role="status">
      <div className="border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[13px] text-[var(--muted-foreground)]">
        {message}
      </div>
    </div>
  );
}