"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { useNarasumber } from "@/context/NarasumberContext";
import { formatDate } from "@/types";
import { cn, escapeCsvCell } from "@/lib/utils";

interface ProgramStat {
  program: string;
  /** Total kehadiran (siaran) tercatat pada program ini */
  totalSiaran: number;
  /** Jumlah narasumber unik yang pernah mengikuti program ini */
  totalNarasumber: number;
  /** Jumlah narasumber yang muncul lebih dari sekali di program yang sama */
  narasumberBerulang: number;
  /** Total kehadiran dari narasumber yang berulang */
  kehadiranBerulang: number;
  narasumberDetail: {
    id: string;
    nama: string;
    instansi: string;
    count: number;
    terakhir: string;
    tanggalList: string[];
  }[];
  terakhir: string;
}

const DONUT_COLORS = [
  "#f2c230",
  "#2f9e8f",
  "#e0674f",
  "#5b8dd9",
  "#9a6dd7",
  "#58b368",
  "#d95f8a",
  "#7f8c9b",
];

export default function ProgramPage() {
  const { narasumberList, jadwalList } = useNarasumber();
  const [query, setQuery] = useState("");

  const programStats = useMemo<ProgramStat[]>(() => {
    const map = new Map<
      string,
      {
        totalSiaran: number;
        narasumber: Map<
          string,
          { nama: string; instansi: string; count: number; terakhir: string; tanggalList: string[] }
        >;
        terakhir: string;
      }
    >();
    for (const n of narasumberList) {
      for (const r of n.riwayat ?? []) {
        const key = r.program?.trim() || "Tanpa Program";
        let entry = map.get(key);
        if (!entry) {
          entry = { totalSiaran: 0, narasumber: new Map(), terakhir: r.tanggal };
          map.set(key, entry);
        }
        entry.totalSiaran += 1;
        if (r.tanggal > entry.terakhir) entry.terakhir = r.tanggal;
        const existing = entry.narasumber.get(n.id);
        if (existing) {
          existing.count += 1;
          if (r.tanggal > existing.terakhir) existing.terakhir = r.tanggal;
          existing.tanggalList.push(r.tanggal);
        } else {
          entry.narasumber.set(n.id, {
            nama: n.nama,
            instansi: n.instansi,
            count: 1,
            terakhir: r.tanggal,
            tanggalList: [r.tanggal],
          });
        }
      }
    }
    for (const jadwal of jadwalList) {
      if (jadwal.status !== "dijadwalkan" && jadwal.status !== "ditunda") continue;
      const narasumber = narasumberList.find((n) => n.id === jadwal.narasumberId);
      if (!narasumber) continue;
      const tanggal = jadwal.status === "ditunda" ? jadwal.tanggalBaru || jadwal.tanggal : jadwal.tanggal;
      const key = jadwal.program?.trim() || "Tanpa Program";
      let entry = map.get(key);
      if (!entry) {
        entry = { totalSiaran: 0, narasumber: new Map(), terakhir: tanggal };
        map.set(key, entry);
      }
      entry.totalSiaran += 1;
      if (tanggal > entry.terakhir) entry.terakhir = tanggal;
      const existing = entry.narasumber.get(narasumber.id);
      if (existing) {
        existing.count += 1;
        if (tanggal > existing.terakhir) existing.terakhir = tanggal;
        existing.tanggalList.push(tanggal);
      } else {
        entry.narasumber.set(narasumber.id, {
          nama: narasumber.nama,
          instansi: narasumber.instansi,
          count: 1,
          terakhir: tanggal,
          tanggalList: [tanggal],
        });
      }
    }
    return Array.from(map.entries())
      .map(([program, entry]) => {
        const detail = Array.from(entry.narasumber.entries()).map(([id, v]) => ({
          id,
          nama: v.nama,
          instansi: v.instansi,
          count: v.count,
          terakhir: v.terakhir,
          tanggalList: [...v.tanggalList].sort((a, b) => a.localeCompare(b)),
        }));
        const berulang = detail.filter((d) => d.count > 1);
        return {
          program,
          totalSiaran: entry.totalSiaran,
          totalNarasumber: entry.narasumber.size,
          narasumberBerulang: berulang.length,
          kehadiranBerulang: berulang.reduce((acc, d) => acc + d.count, 0),
          narasumberDetail: detail.sort((a, b) => b.count - a.count || a.nama.localeCompare(b.nama)),
          terakhir: entry.terakhir,
        };
      })
      .sort((a, b) => b.totalSiaran - a.totalSiaran || a.program.localeCompare(b.program));
  }, [narasumberList, jadwalList]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return programStats;
    return programStats.filter(
      (p) =>
        p.program.toLowerCase().includes(q) ||
        p.narasumberDetail.some((d) => d.nama.toLowerCase().includes(q) || d.instansi.toLowerCase().includes(q))
    );
  }, [programStats, query]);

  /** Donut: porsi "narasumber berulang" per program — program mana yang paling sering memakai narasumber yang sama */
  const donutData = useMemo(() => {
    const list = programStats.filter((p) => p.narasumberBerulang > 0);
    const total = list.reduce((acc, p) => acc + p.narasumberBerulang, 0) || 1;
    let offset = 0;
    return {
      total,
      segments: list.map((p, i) => {
        const fraction = p.narasumberBerulang / total;
        const seg = { ...p, fraction, offset, color: DONUT_COLORS[i % DONUT_COLORS.length] };
        offset += fraction;
        return seg;
      }),
    };
  }, [programStats]);

  const ringkasan = useMemo(() => {
    const totalProgram = programStats.length;
    const totalSiaran = programStats.reduce((a, p) => a + p.totalSiaran, 0);
    const narasumberUnik = new Set<string>();
    for (const p of programStats) for (const d of p.narasumberDetail) narasumberUnik.add(d.id);
    const palingSering = donutData.segments[0]?.program ?? "—";
    return { totalProgram, totalSiaran, totalNarasumber: narasumberUnik.size, palingSering };
  }, [programStats, donutData]);

  const handleExport = () => {
    const header = "Program,Total Siaran,Total Narasumber,Narasumber Berulang,Terakhir Siaran\n";
    const rows = filtered.map((p) =>
      [p.program, p.totalSiaran, p.totalNarasumber, p.narasumberBerulang, formatDate(p.terakhir)]
        .map(escapeCsvCell)
        .join(",")
    );
    const csv = header + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "laporan-program-tvri.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="photo-page-shell">
      <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
      <header className="mb-5 flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="section-label">Laporan Program</p>
          <h1 className="mt-2 text-[22px] font-semibold">Program Siaran TVRI Kaltim</h1>
          <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
            Rekap program dari riwayat siaran dan jadwal aktif yang dikelola di panel admin.
          </p>
        </div>
        <button onClick={handleExport} className="btn btn-outline" disabled={filtered.length === 0}>
          <Download size={14} /> Ekspor CSV
        </button>
      </header>

      <div className="mb-6">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari program, narasumber, atau instansi..."
          className="field-input w-full max-w-md"
          aria-label="Cari program, narasumber, atau instansi"
        />
      </div>

      <section className="mb-8 grid gap-px bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
        <div className="border-l-2 border-[var(--accent)] bg-[var(--card)] px-4 py-3">
          <p className="text-[12px] font-medium text-[var(--muted-foreground)]">Total Program</p>
          <p className="mt-2 text-[26px] font-semibold">{ringkasan.totalProgram}</p>
        </div>
        <div className="border-l-2 border-[var(--accent)] bg-[var(--card)] px-4 py-3">
          <p className="text-[12px] font-medium text-[var(--muted-foreground)]">Total Siaran dan Jadwal</p>
          <p className="mt-2 text-[26px] font-semibold">{ringkasan.totalSiaran}</p>
        </div>
        <div className="border-l-2 border-[var(--accent)] bg-[var(--card)] px-4 py-3">
          <p className="text-[12px] font-medium text-[var(--muted-foreground)]">Narasumber Terlibat</p>
          <p className="mt-2 text-[26px] font-semibold">{ringkasan.totalNarasumber}</p>
        </div>
        <div className="border-l-2 border-[var(--accent)] bg-[var(--card)] px-4 py-3">
          <p className="text-[12px] font-medium text-[var(--muted-foreground)]">Program dengan Narasumber Berulang</p>
          <p className="mt-2 truncate text-[16px] font-semibold">{ringkasan.palingSering}</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface p-4">
          <h2 className="mb-1 border-b border-[var(--border)] pb-2 text-[14px] font-semibold">
            Narasumber Berulang per Program
          </h2>
          <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">
            Program dengan narasumber yang tampil lebih dari sekali.
          </p>
          {donutData.segments.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[var(--muted-foreground)]">
              Belum ada program dengan narasumber yang tampil berulang.
            </p>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
              <svg viewBox="0 0 42 42" className="h-48 w-48 shrink-0 -rotate-90" role="img" aria-label="Grafik lingkaran narasumber berulang per program">
                <circle cx="21" cy="21" r="15.9155" fill="transparent" stroke="var(--muted)" strokeWidth="6" />
                {donutData.segments.map((s) => (
                  <circle
                    key={s.program}
                    cx="21"
                    cy="21"
                    r="15.9155"
                    fill="transparent"
                    stroke={s.color}
                    strokeWidth="6"
                    strokeDasharray={`${(s.fraction * 100).toFixed(2)} ${(100 - s.fraction * 100).toFixed(2)}`}
                    strokeDashoffset={`${(-s.offset * 100).toFixed(2)}`}
                  >
                    <title>{`${s.program}: ${s.narasumberBerulang} narasumber berulang`}</title>
                  </circle>
                ))}
              </svg>
              <ul className="min-w-0 flex-1 space-y-2">
                {donutData.segments.slice(0, 8).map((s) => (
                  <li key={s.program} className="flex items-center gap-2 text-[12px]">
                    <span className="h-3 w-3 shrink-0" style={{ background: s.color }} />
                    <span className="min-w-0 flex-1 truncate font-medium">{s.program}</span>
                    <span className="shrink-0 text-[var(--muted-foreground)]">
                      {s.narasumberBerulang} narasumber ({Math.round(s.fraction * 100)}%)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="surface p-4">
          <h2 className="mb-3 border-b border-[var(--border)] pb-2 text-[14px] font-semibold">
            Ringkasan Program
          </h2>
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[var(--muted-foreground)]">
              Tidak ada program yang cocok dengan pencarian.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Program</th>
                    <th>Siaran</th>
                    <th>Narasumber</th>
                    <th>Berulang</th>
                    <th>Terakhir</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.program}>
                      <td className="font-semibold">{p.program}</td>
                      <td>{p.totalSiaran}x</td>
                      <td>{p.totalNarasumber} orang</td>
                      <td>
                        {p.narasumberBerulang > 0 ? (
                          <span
                            className="font-semibold text-[var(--accent)]"
                            title={`${p.kehadiranBerulang} kehadiran dari narasumber yang berulang`}
                          >
                            {p.narasumberBerulang} orang
                          </span>
                        ) : (
                          <span className="text-[var(--muted-foreground)]">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-[var(--muted-foreground)]">{formatDate(p.terakhir)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-[14px] font-semibold">Narasumber per Program</h2>
        {filtered.length === 0 ? (
          <div className="surface py-8 text-center text-[13px] text-[var(--muted-foreground)]">
            Belum ada data program.
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((p) => (
              <div key={p.program} className="surface p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-2">
                  <h3 className="text-[14px] font-semibold">{p.program}</h3>
                  <span className="text-[12px] text-[var(--muted-foreground)]">
                    {p.totalSiaran} siaran · {p.totalNarasumber} narasumber terlibat
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {p.narasumberDetail.map((d) => (
                    <Link
                      key={d.id}
                      href={`/narasumber/${d.id}`}
                      className={cn(
                        "flex items-start justify-between gap-2 border-[var(--border)] px-3 py-2 text-[13px] transition-colors hover:border-[var(--accent)]"
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{d.nama}</span>
                        <span className="block truncate text-[12px] text-[var(--muted-foreground)]">
                          {d.instansi}
                        </span>
                        <span className="mt-1 block text-[12px] text-[var(--muted-foreground)]">
                          Tampil: {d.tanggalList.map((t) => formatDate(t)).join(", ")}
                        </span>
                      </span>
                      <span className="shrink-0 text-[12px] font-semibold text-[var(--accent)]">
                        {d.count}x
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      </div>
    </div>
  );
}
