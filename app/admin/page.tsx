"use client";

import { useMemo } from "react";
import Link from "next/link";
import { RotateCcw, Settings2 } from "lucide-react";
import { useNarasumber } from "@/context/NarasumberContext";
import { useToast } from "@/context/ToastContext";
import {
  formatDate,
  formatDateTime,
  formatWaitingPeriod,
  getCooldownEnd,
  getLastAppearance,
  getNarasumberStatus,
  getRemainingDays,
} from "@/types";
import { AdminSubNav, StatCard, JadwalBadge } from "@/components/admin/AdminUI";
import { StatusBadge } from "@/components/StatusBadge";
import { AdminGuard } from "@/components/admin/AdminGuard";

export default function AdminDashboardPage() {
  return (
    <AdminGuard>
      <DashboardContent />
    </AdminGuard>
  );
}

function DashboardContent() {
  const { narasumberList, jadwalList, logList, resetToSampleData, waitingPeriod } = useNarasumber();
  const { showToast } = useToast();

  const stats = useMemo(() => {
    let tersedia = 0, dalamJeda = 0, belumTampil = 0, totalSiaran = 0;
    for (const n of narasumberList) {
      const last = getLastAppearance(n);
      const st = getNarasumberStatus(last);
      if (st === "tersedia") tersedia++;
      else if (st === "dalam-jeda") dalamJeda++;
      else belumTampil++;
      totalSiaran += n.riwayat?.length ?? 0;
    }
    return { tersedia, dalamJeda, belumTampil, totalSiaran, total: narasumberList.length };
  }, [narasumberList]);

  const { jadwalHariIni, jadwalMingguIni } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString().slice(0, 10);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + 7);
    const endOfWeekIso = endOfWeek.toISOString().slice(0, 10);

    const hariIni = jadwalList.filter((j) => j.tanggal === todayIso && j.status === "dijadwalkan");
    const mingguIni = jadwalList
      .filter(
        (j) => j.tanggal >= todayIso && j.tanggal <= endOfWeekIso && j.status === "dijadwalkan"
      )
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

    return { jadwalHariIni: hariIni, jadwalMingguIni: mingguIni };
  }, [jadwalList]);

  const jadwalBermasalah = useMemo(
    () =>
      jadwalList.filter((j) => j.status === "dibatalkan" || j.status === "ditunda").slice(0, 5),
    [jadwalList]
  );

  const segeraTersedia = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30 = new Date(today);
    in30.setDate(today.getDate() + 30);

    return narasumberList
      .filter((n) => {
        const last = getLastAppearance(n);
        const st = getNarasumberStatus(last);
        if (st !== "dalam-jeda") return false;
        const end = getCooldownEnd(last);
        return end && end <= in30;
      })
      .map((n) => {
        const last = getLastAppearance(n);
        const end = getCooldownEnd(last)!;
        const sisa = getRemainingDays(last);
        return { ...n, sisa, boleh: end.toISOString() };
      })
      .sort((a, b) => a.sisa - b.sisa)
      .slice(0, 5);
  }, [narasumberList]);

  const rekomendasi = useMemo(() => {
    return narasumberList
      .filter((n) => {
        const st = getNarasumberStatus(getLastAppearance(n));
        return st === "tersedia" || st === "belum-tampil";
      })
      .sort((a, b) => {
        const la = getLastAppearance(a) ?? "";
        const lb = getLastAppearance(b) ?? "";
        return la.localeCompare(lb);
      })
      .slice(0, 6);
  }, [narasumberList]);

  const getNama = (id: string) => narasumberList.find((n) => n.id === id)?.nama ?? id;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
      <div className="page-heading mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="section-label">Area administrasi</p>
          <h1 className="mt-2 text-[26px] font-semibold">Dashboard Pengelolaan Siaran</h1>
          <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
            Sistem Manajemen Narasumber Siaran TVRI Kalimantan Timur
          </p>
        </div>
        <button
          onClick={() => {
            if (
              confirm(
                "Muat ulang data sampel TVRI lengkap? Data akan berisi contoh narasumber dengan status Boleh Diundang, Dalam Masa Tunggu, dan Belum Pernah Tampil beserta riwayat siarannya."
              )
            ) {
              resetToSampleData();
              showToast("Data sampel TVRI berhasil dimuat.", "success");
            }
          }}
          className="btn btn-outline"
          title="Muat data contoh TVRI untuk simulasi status rotasi"
        >
          <RotateCcw size={14} /> Muat Data Contoh
        </button>
      </div>

      <AdminSubNav />

      <section className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-5 py-4">
        <div>
          <p className="text-[12px] font-medium text-[var(--muted-foreground)]">Masa Tunggu Narasumber</p>
          <p className="mt-1 text-[20px] font-semibold">
            {formatWaitingPeriod(waitingPeriod)}
            <span className="ml-2 text-[12px] font-normal text-[var(--muted-foreground)]">(dari database — berlaku untuk semua perhitungan rotasi)</span>
          </p>
        </div>
        <Link href="/admin/settings" className="btn btn-outline">
          <Settings2 size={14} /> Atur Masa Tunggu
        </Link>
      </section>

      <section className="mb-8">
        <h2 className="section-label mb-3">Ringkasan data</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total Narasumber" value={stats.total} />
          <StatCard label="Boleh Diundang" value={stats.tersedia} />
          <StatCard label="Dalam Masa Tunggu" value={stats.dalamJeda} />
          <StatCard label="Belum Pernah Tampil" value={stats.belumTampil} />
          <StatCard label="Total Siaran Tercatat" value={stats.totalSiaran} />
        </div>
      </section>

      {(jadwalHariIni.length > 0 || segeraTersedia.length > 0 || jadwalBermasalah.length > 0) && (
        <section className="mb-8">
          <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Perlu Perhatian
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {jadwalHariIni.length > 0 && (
              <div className="surface p-4">
                <p className="text-[12px] font-medium text-[var(--muted-foreground)]">
                  Jadwal Hari Ini
                </p>
                <p className="mt-2 text-[26px] font-semibold">{jadwalHariIni.length}</p>
                <p className="text-[12px] text-[var(--muted-foreground)]">jadwal siaran aktif hari ini</p>
              </div>
            )}
            {segeraTersedia.length > 0 && (
              <div className="surface p-4">
                <p className="text-[12px] font-medium text-[var(--muted-foreground)]">
                  Segera Tersedia
                </p>
                <p className="mt-2 text-[26px] font-semibold">{segeraTersedia.length}</p>
                <p className="text-[12px] text-[var(--muted-foreground)]">
                  masa tunggu selesai dalam 30 hari
                </p>
              </div>
            )}
            {jadwalBermasalah.length > 0 && (
              <div className="surface p-4">
                <p className="text-[12px] font-medium text-[var(--muted-foreground)]">
                  Perlu Ditinjau
                </p>
                <p className="mt-2 text-[26px] font-semibold">{jadwalBermasalah.length}</p>
                <p className="text-[12px] text-[var(--muted-foreground)]">jadwal dibatalkan / ditunda</p>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold">Jadwal 7 Hari ke Depan</h2>
            <Link href="/admin/jadwal" className="text-[12px] font-medium text-[var(--accent)] hover:underline">
              Lihat semua
            </Link>
          </div>
          {jadwalMingguIni.length === 0 ? (
            <div className="surface py-6 text-center text-[13px] text-[var(--muted-foreground)]">
              Tidak ada jadwal dalam 7 hari ke depan.
            </div>
          ) : (
            <div className="surface overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Narasumber</th>
                    <th>Program</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {jadwalMingguIni.map((j) => (
                    <tr key={j.id}>
                      <td className="whitespace-nowrap font-semibold">{formatDate(j.tanggal)}</td>
                      <td>
                        <Link
                          href={`/narasumber/${j.narasumberId}`}
                          className="font-semibold hover:text-[var(--accent)] hover:underline"
                        >
                          {getNama(j.narasumberId)}
                        </Link>
                        {j.topik && (
                          <div className="text-[12px] text-[var(--muted-foreground)]">
                            {j.topik}
                          </div>
                        )}
                      </td>
                      <td>
                        {j.program}
                        {j.waktu && (
                          <div className="text-[12px] text-[var(--muted-foreground)]">
                            {j.waktu} WITA
                          </div>
                        )}
                      </td>
                      <td>
                        <JadwalBadge status={j.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold">Segera Tersedia</h2>
            <Link
              href="/narasumber?filter=dalam-jeda"
              className="text-[12px] font-medium text-[var(--accent)] hover:underline"
            >
              Lihat semua
            </Link>
          </div>
          {segeraTersedia.length === 0 ? (
            <div className="surface py-6 text-center text-[13px] text-[var(--muted-foreground)]">
              Tidak ada narasumber yang segera keluar masa tunggu.
            </div>
          ) : (
            <div className="surface overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Narasumber</th>
                    <th>Boleh Kembali</th>
                    <th>Sisa</th>
                  </tr>
                </thead>
                <tbody>
                  {segeraTersedia.map((n) => (
                    <tr key={n.id}>
                      <td>
                        <Link
                          href={`/narasumber/${n.id}`}
                          className="font-semibold hover:text-[var(--accent)] hover:underline"
                        >
                          {n.nama}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap text-[var(--muted-foreground)]">
                        {formatDate(n.boleh)}
                      </td>
                      <td>
                        <span className="text-[12px] font-semibold text-[var(--warning)]">
                          {n.sisa} hr
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold">Rekomendasi Narasumber</h2>
            <Link
              href="/narasumber?filter=tersedia"
              className="text-[12px] font-medium text-[var(--accent)] hover:underline"
            >
              Lihat semua
            </Link>
          </div>
          {rekomendasi.length === 0 ? (
            <div className="surface py-6 text-center text-[13px] text-[var(--muted-foreground)]">
              Belum ada narasumber yang tersedia.
            </div>
          ) : (
            <div className="surface overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Narasumber</th>
                    <th>Instansi</th>
                    <th>Terakhir Tampil</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rekomendasi.map((n) => {
                    const last = getLastAppearance(n);
                    const st = getNarasumberStatus(last);
                    return (
                      <tr key={n.id}>
                        <td>
                          <Link
                            href={`/narasumber/${n.id}`}
                            className="font-semibold hover:text-[var(--accent)] hover:underline"
                          >
                            {n.nama}
                          </Link>
                        </td>
                        <td className="text-[var(--muted-foreground)]">{n.instansi}</td>
                        <td className="whitespace-nowrap">{formatDate(last)}</td>
                        <td>
                          <StatusBadge status={st} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold">Log Aktivitas & Audit Trail</h2>
          <span className="text-[12px] text-[var(--muted-foreground)]">
            Menampilkan riwayat aksi admin terbaru
          </span>
        </div>

        {logList.length === 0 ? (
          <div className="surface py-6 text-center text-[13px] text-[var(--muted-foreground)]">
            Belum ada aktivitas admin yang tercatat.
          </div>
        ) : (
          <div className="surface overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Aksi</th>
                  <th>Detail</th>
                  <th>Aktor</th>
                  <th>Waktu</th>
                </tr>
              </thead>
              <tbody>
                {logList.slice(0, 8).map((log) => {
                  const isOverride =
                    log.aksi.includes("[OVERRIDE") || log.aksi.toLowerCase().includes("override");
                  return (
                    <tr key={log.id}>
                      <td className="font-semibold">
                        {log.aksi}
                        {isOverride && (
                          <span className="ml-2 inline border border-[var(--warning)] px-1 text-[10px] font-semibold text-[var(--warning)]">
                            OVERRIDE
                          </span>
                        )}
                      </td>
                      <td className="text-[var(--muted-foreground)]">{log.detail || "-"}</td>                      <td>{log.aktor}</td>
                      <td className="whitespace-nowrap text-[var(--muted-foreground)]">
                        {formatDateTime(log.waktu)} WITA
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}