"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useNarasumber } from "@/context/NarasumberContext";
import { formatDate, getLastAppearance, getNarasumberStatus, JENIS_SIARAN_LABEL } from "@/types";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSubNav, StatCard } from "@/components/admin/AdminUI";
import { cn, escapeCsvCell } from "@/lib/utils";

type Periode = "bulan_ini" | "tiga_bulan" | "enam_bulan" | "tahun_ini" | "semua";

function getPeriodeStart(p: Periode): string {
  const now = new Date();
  if (p === "bulan_ini") return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  if (p === "tiga_bulan") { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0, 10); }
  if (p === "enam_bulan") { const d = new Date(now); d.setMonth(d.getMonth() - 6); return d.toISOString().slice(0, 10); }
  if (p === "tahun_ini") return `${now.getFullYear()}-01-01`;
  return "0000-01-01";
}

export default function LaporanPage() {
  return <AdminGuard><LaporanContent /></AdminGuard>;
}

function LaporanContent() {
  const { narasumberList } = useNarasumber();
  const [periode, setPeriode] = useState<Periode>("tahun_ini");

  const startDate = getPeriodeStart(periode);

  const riwayatFiltered = useMemo(() => {
    return narasumberList.flatMap((n) =>
      (n.riwayat ?? [])
        .filter((r) => r.tanggal >= startDate)
        .map((r) => ({ ...r, narasumber: n }))
    ).sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [narasumberList, startDate]);

  const stats = useMemo(() => {
    let tersedia = 0, dalamJeda = 0, belumTampil = 0;
    for (const n of narasumberList) {
      const st = getNarasumberStatus(getLastAppearance(n));
      if (st === "tersedia") tersedia++;
      else if (st === "dalam-jeda") dalamJeda++;
      else belumTampil++;
    }
    return { total: narasumberList.length, tersedia, dalamJeda, belumTampil, totalSiaran: riwayatFiltered.length };
  }, [narasumberList, riwayatFiltered]);

  const perBulan = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of riwayatFiltered) {
      const key = r.tanggal.slice(0, 7);
      map[key] = (map[key] ?? 0) + 1;
    }
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [riwayatFiltered]);

  const maxBulan = Math.max(1, ...perBulan.map((b) => b[1]));

  const topNarasumber = useMemo(() => {
    const map: Record<string, { nama: string; instansi: string; count: number }> = {};
    for (const r of riwayatFiltered) {
      const id = r.narasumber.id;
      if (!map[id]) map[id] = { nama: r.narasumber.nama, instansi: r.narasumber.instansi, count: 0 };
      map[id].count++;
    }
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [riwayatFiltered]);

  const topInstansi = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of riwayatFiltered) {
      const i = r.narasumber.instansi;
      map[i] = (map[i] ?? 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [riwayatFiltered]);

  const maxInstansi = Math.max(1, ...topInstansi.map((x) => x[1]));

  const handleExportCSV = () => {
    const header = "Nama,Instansi,Jabatan,Bidang,Tanggal Siaran,Program,Topik,Jenis Siaran\n";
    const rows = riwayatFiltered.map((r) =>
      [r.narasumber.nama, r.narasumber.instansi, r.narasumber.jabatan ?? "", r.narasumber.bidang, formatDate(r.tanggal), r.program, r.topik ?? "", JENIS_SIARAN_LABEL[r.jenisSiaran ?? "live"]]
        .map(escapeCsvCell)
        .join(",")
    );
    const csv = header + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-narasumber-tvri-${periode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportDaftar = () => {
    const header = "Nama,Instansi,Jabatan,Bidang,Kontak,Total Siaran,Terakhir Tampil,Status\n";
    const rows = narasumberList.map((n) => {
      const last = getLastAppearance(n);
      const st = getNarasumberStatus(last);
      const stLabel = st === "tersedia" ? "Boleh Diundang" : st === "dalam-jeda" ? "Dalam Masa Tunggu" : "Belum Pernah Tampil";
      return [n.nama, n.instansi, n.jabatan ?? "", n.bidang, n.phone ?? "", n.riwayat?.length ?? 0, formatDate(last), stLabel]
        .map(escapeCsvCell)
        .join(",");
    });
    const csv = header + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "daftar-narasumber-tvri.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const periodeLabel = periode === "semua" ? "Semua" : periode.replace("_", " ");

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
      <div className="mb-5 flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[20px] font-semibold">Laporan & Statistik</h1>
          <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
            Ringkasan data narasumber dan riwayat siaran TVRI Kaltim.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportDaftar} className="btn btn-outline">
            <Download size={14} /> Ekspor Daftar Narasumber
          </button>
          <button onClick={handleExportCSV} className="btn btn-primary">
            <Download size={14} /> Ekspor Riwayat Siaran
          </button>
        </div>
      </div>

      <AdminSubNav />

      <div className="mb-4 flex flex-wrap items-center gap-1 border-b border-[var(--border)]">
        {([
          ["bulan_ini", "Bulan Ini"],
          ["tiga_bulan", "3 Bulan Terakhir"],
          ["enam_bulan", "6 Bulan Terakhir"],
          ["tahun_ini", "Tahun Ini"],
          ["semua", "Semua Waktu"],
        ] as [Periode, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPeriode(key)}
            className={cn(
              "btn-focus -mb-px border-b-2 px-2 pb-2 pt-1 text-[12px] font-medium transition-colors",
              periode === key
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="mb-6">
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Ringkasan Statistik
        </h2>
        <div className="grid gap-px bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total Narasumber" value={stats.total} />
          <StatCard label="Boleh Diundang" value={stats.tersedia} />
          <StatCard label="Dalam Masa Tunggu" value={stats.dalamJeda} />
          <StatCard label="Belum Pernah Tampil" value={stats.belumTampil} />
          <StatCard label={`Siaran Tercatat (${periodeLabel})`} value={stats.totalSiaran} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface p-4">
          <h2 className="mb-3 border-b border-[var(--border)] pb-2 text-[14px] font-semibold">
            Siaran per Bulan
          </h2>
          {perBulan.length === 0 ? (
            <p className="text-[13px] text-[var(--muted-foreground)]">Tidak ada data pada periode ini.</p>
          ) : (
            <div className="space-y-2">
              {perBulan.map(([bulan, count]) => {
                const [y, m] = bulan.split("-");
                const label = `${["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"][parseInt(m) - 1]} ${y}`;
                return (
                  <div key={bulan} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-[12px] text-[var(--muted-foreground)]">
                      {label}
                    </span>
                    <div className="flex-1 bg-[var(--muted)]" style={{ height: 14 }}>
                      <div
                        className="h-full bg-[var(--accent)]"
                        style={{ width: `${(count / maxBulan) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-[12px] font-semibold">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="surface p-4">
          <h2 className="mb-3 border-b border-[var(--border)] pb-2 text-[14px] font-semibold">
            Narasumber Paling Sering Tampil
          </h2>
          {topNarasumber.length === 0 ? (
            <p className="text-[13px] text-[var(--muted-foreground)]">Tidak ada data pada periode ini.</p>
          ) : (
            <ol className="space-y-1.5">
              {topNarasumber.map((n, i) => (
                <li key={n.nama} className="flex items-center gap-3 border-b border-[var(--border)] py-1.5 last:border-0">
                  <span className="w-5 shrink-0 text-[12px] font-semibold text-[var(--muted-foreground)]">
                    {i + 1}.
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">{n.nama}</p>
                    <p className="truncate text-[12px] text-[var(--muted-foreground)]">{n.instansi}</p>
                  </div>
                  <span className="shrink-0 border border-[var(--border-strong)] px-2 py-0.5 text-[12px] font-semibold text-[var(--accent)]">
                    {n.count}x
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="surface p-4 lg:col-span-2">
          <h2 className="mb-3 border-b border-[var(--border)] pb-2 text-[14px] font-semibold">
            Siaran Berdasarkan Instansi
          </h2>
          {topInstansi.length === 0 ? (
            <p className="text-[13px] text-[var(--muted-foreground)]">Tidak ada data pada periode ini.</p>
          ) : (
            <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {topInstansi.map(([inst, count]) => (
                <div key={inst} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">{inst}</p>
                    <div className="mt-1 bg-[var(--muted)]" style={{ height: 6 }}>
                      <div className="h-full bg-[var(--accent)]" style={{ width: `${(count / maxInstansi) * 100}%` }} />
                    </div>
                  </div>
                  <span className="shrink-0 text-[13px] font-semibold">{count}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="mt-6">
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Riwayat Siaran Terbaru
        </h2>
        {riwayatFiltered.length === 0 ? (
          <div className="surface py-8 text-center text-[13px] text-[var(--muted-foreground)]">
            Tidak ada riwayat siaran pada periode ini.
          </div>
        ) : (
          <div className="surface overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Narasumber</th>
                  <th>Instansi</th>
                  <th>Program</th>
                  <th>Topik</th>
                  <th>Jenis Siaran</th>
                </tr>
              </thead>
              <tbody>
                {riwayatFiltered.slice(0, 50).map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap text-[var(--muted-foreground)]">
                      {formatDate(r.tanggal)}
                    </td>
                    <td className="font-semibold">{r.narasumber.nama}</td>
                    <td className="text-[var(--muted-foreground)]">{r.narasumber.instansi}</td>
                    <td>{r.program}</td>
                    <td className="text-[var(--muted-foreground)]">{r.topik || "-"}</td>
                    <td className="font-semibold text-[var(--accent)]">{JENIS_SIARAN_LABEL[r.jenisSiaran ?? "live"]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {riwayatFiltered.length > 50 && (
              <p className="border-t border-[var(--border)] px-4 py-2 text-[12px] text-[var(--muted-foreground)]">
                Menampilkan 50 dari {riwayatFiltered.length} riwayat. Gunakan Export CSV untuk data lengkap.
              </p>
            )}
          </div>
        )}
      </section>

      </div>
  );
}