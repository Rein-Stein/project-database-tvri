"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNarasumber } from "@/context/NarasumberContext";
import { formatDate, JENIS_SIARAN_LABEL, type JadwalStatus } from "@/types";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSubNav, JadwalBadge } from "@/components/admin/AdminUI";
import { cn } from "@/lib/utils";

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const DAYS_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const dotColor: Record<JadwalStatus, string> = {
  dijadwalkan: "bg-[var(--accent)]",
  "sudah-tampil": "bg-[var(--success)]",
  dibatalkan: "bg-[var(--danger)]",
  ditunda: "bg-[var(--border-strong)]",
};

const statusLabel: Record<JadwalStatus, string> = {
  dijadwalkan: "Dijadwalkan",
  "sudah-tampil": "Sudah Tampil",
  dibatalkan: "Dibatalkan",
  ditunda: "Ditunda",
};

export default function KalenderPage() {
  return (
    <AdminGuard>
      <KalenderContent />
    </AdminGuard>
  );
}

function KalenderContent() {
  const { narasumberList, jadwalList } = useNarasumber();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const getNama = (id: string) => narasumberList.find((n) => n.id === id)?.nama ?? "-";

  const { days, firstDow } = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const first = new Date(year, month, 1).getDay();
    return { days: daysInMonth, firstDow: first };
  }, [year, month]);

  const jadwalByDate = useMemo(() => {
    const map: Record<string, typeof jadwalList> = {};
    for (const j of jadwalList) {
      const d = j.tanggal.slice(0, 7);
      const curM = `${year}-${String(month + 1).padStart(2, "0")}`;
      if (d !== curM) continue;
      if (!map[j.tanggal]) map[j.tanggal] = [];
      map[j.tanggal].push(j);
    }
    return map;
  }, [jadwalList, year, month]);

  const todayIso = new Date().toISOString().slice(0, 10);

  const prevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
    setSelectedDate(null);
  };

  const selectedJadwal = selectedDate ? jadwalByDate[selectedDate] ?? [] : [];

  const cells: Array<{ iso: string; day: number } | null> = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: days }, (_, i) => {
      const d = i + 1;
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      return { iso, day: d };
    }),
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
      <div className="mb-5 border-b border-[var(--border)] pb-4">
        <h1 className="text-[20px] font-semibold">Kalender Siaran</h1>
        <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
          Lihat jadwal dan riwayat siaran narasumber dalam tampilan kalender.
        </p>
      </div>
      <AdminSubNav />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="surface p-4">
          <div className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-2">
            <button
              onClick={prevMonth}
              className="btn-focus -ml-1 flex h-7 w-7 items-center justify-center hover:bg-[var(--muted)]"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>
            <h2 className="text-[14px] font-semibold">
              {MONTHS_ID[month]} {year}
            </h2>
            <button
              onClick={nextMonth}
              className="btn-focus -mr-1 flex h-7 w-7 items-center justify-center hover:bg-[var(--muted)]"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-px border-b border-[var(--border)] bg-[var(--border)] text-center">
            {DAYS_ID.map((d) => (
              <div key={d} className="bg-[var(--card)] py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-[var(--border)]">
            {cells.map((cell, i) => {
              if (!cell) return <div key={`empty-${i}`} className="bg-[var(--card)] min-h-[60px]" />;
              const { iso, day } = cell;
              const jadwals = jadwalByDate[iso] ?? [];
              const isToday = iso === todayIso;
              const isSelected = iso === selectedDate;
              return (
                <button
                  key={iso}
                  onClick={() => setSelectedDate(iso === selectedDate ? null : iso)}
                  className={cn(
                    "btn-focus relative flex min-h-[60px] flex-col items-start gap-1 bg-[var(--card)] p-1.5 text-left text-[13px] transition-colors",
                    isToday && "ring-1 ring-inset ring-[var(--accent)]",
                    isSelected && "bg-[var(--muted)]"
                  )}
                >
                  <span
                    className={cn(
                      "font-semibold",
                      isToday ? "text-[var(--accent)]" : "text-[var(--foreground)]"
                    )}
                  >
                    {day}
                  </span>
                  {jadwals.length > 0 && (
                    <div className="flex flex-wrap gap-0.5">
                      {jadwals.slice(0, 4).map((j) => (
                        <span
                          key={j.id}
                          className={cn("h-1.5 w-1.5", dotColor[j.status])}
                          aria-label={`${statusLabel[j.status]} - ${JENIS_SIARAN_LABEL[j.jenisSiaran ?? "live"]}`}
                          title={`${JENIS_SIARAN_LABEL[j.jenisSiaran ?? "live"]} - ${statusLabel[j.status]}`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-3 border-t border-[var(--border)] pt-3 text-[12px] text-[var(--muted-foreground)]">
            {(Object.keys(dotColor) as JadwalStatus[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2", dotColor[s])} />
                {statusLabel[s]}
              </span>
            ))}
          </div>
        </section>

        <aside className="surface p-4">
          {!selectedDate ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center text-[13px] text-[var(--muted-foreground)]">
              <p>Pilih tanggal pada kalender untuk melihat jadwal.</p>
            </div>
          ) : (
            <>
              <h3 className="mb-2 border-b border-[var(--border)] pb-2 text-[14px] font-semibold">
                {formatDate(selectedDate)}
              </h3>
              {selectedJadwal.length === 0 ? (
                <p className="text-[13px] text-[var(--muted-foreground)]">
                  Tidak ada jadwal pada tanggal ini.
                </p>
              ) : (
                <ul className="space-y-3">
                  {selectedJadwal.map((j) => (
                    <li key={j.id} className="border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
                      <div className="mb-1 flex items-center justify-between">
                        <JadwalBadge status={j.status} />
                      </div>
                      <p className="font-semibold">{getNama(j.narasumberId)}</p>
                      <p className="text-[12px] text-[var(--muted-foreground)]">
                        {j.program}
                        {j.waktu ? ` · ${j.waktu} WITA` : ""}
                      </p>
                      <p className="text-[12px] font-semibold text-[var(--accent)]">
                        {JENIS_SIARAN_LABEL[j.jenisSiaran ?? "live"]}
                      </p>
                      {j.topik && (
                        <p className="text-[12px] text-[var(--muted-foreground)]">
                          Topik: {j.topik}
                        </p>
                      )}
                      {j.catatan && (
                        <p className="mt-1 text-[12px] italic text-[var(--muted-foreground)]">
                          “{j.catatan}”
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}