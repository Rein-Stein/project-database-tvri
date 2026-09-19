"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2, FileText, Hourglass, Radio, Users } from "lucide-react";
import { useNarasumber } from "@/context/NarasumberContext";
import { formatDate, formatWaitingPeriod, getCurrentWaitingPeriodSetting, getNarasumberStatus, getRemainingDays } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { DatabaseStatus } from "@/components/DatabaseStatus";

export default function HomePage() {
  const router = useRouter();
  const { narasumberList } = useNarasumber();
  const waitingPeriodText = formatWaitingPeriod(getCurrentWaitingPeriodSetting());
  const tersedia = narasumberList.filter((n) => getNarasumberStatus(n.lastAppearance) === "tersedia").length;
  const dalamJeda = narasumberList.filter((n) => getNarasumberStatus(n.lastAppearance) === "dalam-jeda").length;
  const belumTampil = narasumberList.length - tersedia - dalamJeda;
  const terbaru = [...narasumberList]
    .sort((a, b) => (b.lastAppearance ?? "").localeCompare(a.lastAppearance ?? ""))
    .slice(0, 8);
  const stats = [
    { label: "Total Narasumber", value: narasumberList.length, icon: Users, color: "text-[var(--accent)]" },
    { label: "Boleh Diundang", value: tersedia, icon: CheckCircle2, color: "text-[var(--success)]" },
    { label: "Dalam Masa Tunggu", value: dalamJeda, icon: Hourglass, color: "text-[var(--warning)]" },
    { label: "Belum Pernah Tampil", value: belumTampil, icon: Radio, color: "text-[var(--muted-foreground)]" },
  ];

  return (
    <div className="min-h-screen">
      <DatabaseStatus />
      <section
        className="home-hero relative min-h-[520px] overflow-hidden border-b border-[#0d376e] bg-[#0b3b82] bg-cover bg-center"
        style={{ backgroundImage: "url('/beranda2_bg.png')" }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,32,78,0.88)_0%,rgba(7,55,116,0.68)_48%,rgba(7,55,116,0.18)_100%)]" />
        <div className="relative mx-auto flex min-h-[520px] max-w-6xl flex-col justify-center gap-8 px-6 py-14 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#f05d5e]" />
              <p className="mono-label text-[11px] font-medium text-white/75">ON AIR / CONTROL ROOM</p>
            </div>
            <p className="section-label text-white/70">Sistem Informasi TVRI Kalimantan Timur</p>
            <h1 className="mt-2 max-w-2xl text-[30px] font-extrabold leading-tight tracking-[-0.02em] text-white sm:text-[42px]">Manajemen Narasumber Siaran</h1>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-white/80">
              Ringkasan data narasumber dan kesiapan siaran untuk mendukung pengelolaan program secara teratur.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/narasumber" className="btn !border-[#f4c95d] !bg-[#f4c95d] !text-[#092735] hover:!bg-[#ffda7c]"><Users size={14} /> Daftar Narasumber</Link>
            <Link href="/admin/jadwal" className="btn !border-white/50 !bg-white/10 !text-white hover:!bg-white/20"><CalendarDays size={14} /> Jadwal Siaran</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="surface flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[3px] bg-[var(--accent-muted)]">
                <stat.icon size={19} className={stat.color} />
              </div>
              <div><p className="text-[12px] font-semibold text-[var(--muted-foreground)]">{stat.label}</p><p className="mt-0.5 text-[26px] font-bold">{stat.value}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-10 sm:px-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div><p className="section-label">Data terkini</p><h2 className="mt-1 text-[20px] font-semibold">Narasumber terbaru</h2></div>
          <Link href="/narasumber" className="flex items-center gap-1 text-[13px] font-semibold text-[var(--accent)] hover:underline">Lihat semua <ArrowRight size={14} /></Link>
        </div>
        <div className="surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Nama</th><th>Jabatan</th><th>Bidang</th><th>Instansi</th><th>Terakhir Siaran</th><th>Status</th></tr></thead>
              <tbody>{terbaru.map((n) => { const status = getNarasumberStatus(n.lastAppearance); return <tr key={n.id} tabIndex={0} role="link" onClick={() => router.push(`/narasumber/${n.id}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); router.push(`/narasumber/${n.id}`); } }} className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]"><td><span className="font-semibold hover:text-[var(--accent)]">{n.nama}</span></td><td className="text-[var(--muted-foreground)]">{n.jabatan || "-"}</td><td>{n.bidang}</td><td className="text-[var(--muted-foreground)]">{n.instansi}</td><td className="whitespace-nowrap">{formatDate(n.lastAppearance)}</td><td><StatusBadge status={status} sisa={status === "dalam-jeda" ? getRemainingDays(n.lastAppearance) : undefined} /></td></tr>; })}</tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-10 sm:px-8 md:grid-cols-3">
          <div className="md:col-span-2"><p className="section-label">Ketentuan operasional</p><h2 className="mt-2 text-[20px] font-semibold">Masa jeda penampilan narasumber</h2><p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--muted-foreground)]">Setiap narasumber dapat dijadwalkan kembali setelah jeda {waitingPeriodText.toLowerCase()} kalender sejak siaran terakhir yang dicatat admin.</p></div>
          <div className="flex items-start gap-3 border-[var(--border)] md:border-l md:pl-6"><FileText className="mt-0.5 shrink-0 text-[var(--accent)]" size={18} /><div><p className="text-[13px] font-semibold">Dokumentasi terpusat</p><p className="mt-1 text-[12px] leading-relaxed text-[var(--muted-foreground)]">Riwayat siaran dan status tersedia dalam satu daftar kerja.</p><Link href="/about#ketentuan" className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--accent)] hover:underline">Baca ketentuan <ArrowRight size={13} /></Link></div></div>
        </div>
      </section>
    </div>
  );
}
