"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, MessageCircle, User } from "lucide-react";
import { useNarasumber } from "@/context/NarasumberContext";
import {
  formatDate,
  getCooldownEnd,
  getLastAppearance,
  getNarasumberStatus,
  getRemainingDays,
} from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";

export default function DetailNarasumberPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { narasumberList } = useNarasumber();
  const n = narasumberList.find((x) => x.id === id);

  const last = useMemo(() => (n ? getLastAppearance(n) : null), [n]);
  const riwayatSorted = useMemo(
    () => (n ? [...n.riwayat].sort((a, b) => b.tanggal.localeCompare(a.tanggal)) : []),
    [n]
  );

  if (!n) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <EmptyState
          icon={<User size={28} />}
          title="Narasumber tidak ditemukan."
          description="Data narasumber yang Anda cari tidak tersedia atau telah dihapus."
          actionLabel="Kembali ke Daftar Narasumber"
          actionHref="/narasumber"
        />
      </div>
    );
  }

  const status = getNarasumberStatus(last);
  const sisa = getRemainingDays(last);
  const boleh = getCooldownEnd(last);
  const whatsappNumber = n.phone?.replace(/\D/g, "").replace(/^0/, "62");
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Halo ${n.nama}, kami dari TVRI Kaltim.`)}`
    : null;

  return (
    <div className="photo-page-shell">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/narasumber"
        className="btn-focus mb-4 inline-flex items-center gap-1 text-[13px] text-[var(--muted-foreground)] hover:text-[var(--accent)]"
      >
        <ArrowLeft size={14} /> Kembali ke Daftar
      </Link>

      <header className="mb-5 border-b border-[var(--border)] pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="text-[22px] font-semibold">{n.nama}</h1>
            <StatusBadge status={status} sisa={status === "dalam-jeda" ? sisa : undefined} />
          </div>
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary shrink-0 !h-9 !px-3 text-[12px]"
              aria-label={`Hubungi ${n.nama} melalui WhatsApp`}
            >
              <MessageCircle size={14} />
              <span className="hidden sm:inline">Hubungi via WA</span>
              <span className="sm:hidden">WA</span>
            </a>
          )}
        </div>
        <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
          {n.jabatan && <>{n.jabatan} · </>}{n.instansi}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <section className="surface p-5">
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Data Narasumber
          </h2>
          <dl>
            <div className="info-row">
              <dt>Nama Lengkap</dt>
              <dd>{n.nama}</dd>
            </div>
            {n.jabatan && (
              <div className="info-row">
                <dt>Jabatan</dt>
                <dd>{n.jabatan}</dd>
              </div>
            )}
            <div className="info-row">
              <dt>Bidang</dt>
              <dd>{n.bidang}</dd>
            </div>
            <div className="info-row">
              <dt>Instansi</dt>
              <dd>{n.instansi}</dd>
            </div>
            {n.phone && (
              <div className="info-row">
                <dt>Telepon</dt>
                <dd>{n.phone}</dd>
              </div>
            )}
            <div className="info-row">
              <dt>Total Penampilan</dt>
              <dd>{riwayatSorted.length} kali</dd>
            </div>
          </dl>
        </section>

        <aside className="surface status-card p-5">
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Status Pembatasan
          </h2>
          <dl>
            <div className="info-row">
              <dt>Terakhir Tampil</dt>
              <dd>{formatDate(last)}</dd>
            </div>
            <div className="info-row">
              <dt>Boleh Diundang Kembali</dt>
              <dd>{boleh ? formatDate(boleh.toISOString()) : <span className="text-[var(--muted-foreground)]">Belum pernah tampil</span>}</dd>
            </div>
            <div className="info-row">
              <dt>Sisa Masa Tunggu</dt>
              <dd>
                 {status === "dalam-jeda"
                   ? `${sisa} hari`
                   : status === "tersedia"
                   ? "Selesai — siap diundang"
                   : <span className="text-[var(--muted-foreground)]">Belum pernah tampil</span>}
               </dd>
            </div>
            <div className="info-row">
              <dt>Status Saat Ini</dt>
              <dd>
                <StatusBadge status={status} sisa={status === "dalam-jeda" ? sisa : undefined} />
              </dd>
            </div>
          </dl>
        </aside>
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-[14px] font-semibold">
            Riwayat Siaran
            <span className="ml-2 text-[12px] font-normal text-[var(--muted-foreground)]">
              ({riwayatSorted.length} kali tampil)
            </span>
          </h2>
        </div>
        {riwayatSorted.length === 0 ? (
          <div className="surface py-8 text-center">
            <p className="font-semibold">Narasumber ini belum pernah mengikuti siaran.</p>
            <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
              Riwayat akan tercatat otomatis setelah admin mencatat keikutsertaan siaran.
            </p>
          </div>
        ) : (
          <div className="surface overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Waktu</th>
                  <th>Program</th>
                  <th>Topik</th>
                  <th>Jenis Siaran</th>
                  <th>Catatan</th>
                </tr>
              </thead>
              <tbody>
                {riwayatSorted.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap font-semibold">
                      {formatDate(r.tanggal)}
                    </td>
                    <td className="whitespace-nowrap text-[var(--muted-foreground)]">
                       {r.waktu ? `${r.waktu} WITA` : "-"}
                    </td>
                    <td>{r.program}</td>
                    <td className="text-[var(--muted-foreground)]">{r.topik || "-"}</td>
                    <td className="font-semibold text-[var(--accent)]">{r.jenisSiaran === "rekaman" ? "Rekaman" : "Live"}</td>
                    <td className="text-[var(--muted-foreground)]">{r.catatan || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      </div>
    </div>
  );
}