"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useNarasumber } from "@/context/NarasumberContext";
import {
  formatDate,
  getCooldownEnd,
  getLastAppearance,
  getNarasumberStatus,
  getRemainingDays,
  type NarasumberStatus,
} from "@/types";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { DatabaseStatus } from "@/components/DatabaseStatus";

type Filter = "semua" | NarasumberStatus;
type SortKey = "nama" | "terakhir" | "paling-lama" | "paling-baru";

export default function NarasumberListPage() {
  const router = useRouter();
  const { narasumberList } = useNarasumber();
  const [filter, setFilter] = useState<Filter>("semua");
  const [instansiFilter, setInstansiFilter] = useState("semua");
  const [bidangFilter, setBidangFilter] = useState("semua");
  const [sort, setSort] = useState<SortKey>("nama");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("status") ??
      new URLSearchParams(window.location.search).get("filter");
    if (requested === "tersedia" || requested === "dalam-jeda" || requested === "belum-tampil") {
      setFilter(requested);
    }
  }, []);

  const instansiList = useMemo(
    () => Array.from(new Set(narasumberList.map((n) => n.instansi))).sort(),
    [narasumberList]
  );
  const bidangList = useMemo(
    () => Array.from(new Set(narasumberList.map((n) => n.bidang))).sort(),
    [narasumberList]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = narasumberList.filter((n) => {
      const last = getLastAppearance(n);
      const status = getNarasumberStatus(last);
      if (filter !== "semua" && status !== filter) return false;
      if (instansiFilter !== "semua" && n.instansi !== instansiFilter) return false;
      if (bidangFilter !== "semua" && n.bidang !== bidangFilter) return false;
      if (!q) return true;
      return (
        n.nama.toLowerCase().includes(q) ||
        n.bidang.toLowerCase().includes(q) ||
        n.instansi.toLowerCase().includes(q) ||
        (n.jabatan ?? "").toLowerCase().includes(q)
      );
    });
    const lastOf = (n: (typeof result)[number]) => getLastAppearance(n);
    switch (sort) {
      case "nama":
        return [...result].sort((a, b) => a.nama.localeCompare(b.nama));
      case "terakhir":
      case "paling-baru":
        return [...result].sort((a, b) => (lastOf(b) ?? "").localeCompare(lastOf(a) ?? ""));
      case "paling-lama":
        return [...result].sort((a, b) => (lastOf(a) ?? "0").localeCompare(lastOf(b) ?? "0"));
    }
  }, [narasumberList, filter, instansiFilter, bidangFilter, sort, query]);

  const countBy = (f: Filter) =>
    f === "semua"
      ? narasumberList.length
      : narasumberList.filter((n) => getNarasumberStatus(getLastAppearance(n)) === f).length;

  const filters: { key: Filter; label: string }[] = [
    { key: "semua", label: "Semua" },
    { key: "tersedia", label: "Boleh Diundang" },
    { key: "dalam-jeda", label: "Dalam Masa Tunggu" },
    { key: "belum-tampil", label: "Belum Pernah Tampil" },
  ];

  return (
    <div className="photo-page-shell">
      <DatabaseStatus />
      <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
      <header className="page-heading mb-6">
        <p className="section-label">Data utama</p>
        <h1 className="mt-2 text-[26px] font-semibold">Daftar Narasumber</h1>
        <p className="mt-1 max-w-xl text-[14px] text-[var(--muted-foreground)]">
          Data seluruh narasumber yang terdaftar untuk siaran TVRI Kalimantan Timur.
          Setiap narasumber menjalani masa tunggu yang diatur admin sejak
          penampilan terakhirnya.
        </p>
      </header>

      <div className="mb-4 flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "btn-focus border px-3 py-2 text-[12px] font-semibold transition-colors",
                filter === f.key
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              )}
            >
              {f.label} ({countBy(f.key)})
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama, jabatan, bidang, instansi..."
            aria-label="Cari narasumber"
            className="field-input pl-7"
          />
        </div>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <select
          value={instansiFilter}
          onChange={(e) => setInstansiFilter(e.target.value)}
          aria-label="Filter instansi"
          className="field-input"
        >
          <option value="semua">Semua Instansi</option>
          {instansiList.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        <select
          value={bidangFilter}
          onChange={(e) => setBidangFilter(e.target.value)}
          aria-label="Filter bidang"
          className="field-input"
        >
          <option value="semua">Semua Bidang</option>
          {bidangList.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Urutkan"
          className="field-input"
        >
          <option value="nama">Urutkan: Nama A–Z</option>
          <option value="terakhir">Urutkan: Terakhir tampil</option>
          <option value="paling-lama">Urutkan: Paling lama tidak tampil</option>
          <option value="paling-baru">Urutkan: Paling baru tampil</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="surface py-10 text-center">
          <p className="font-semibold">Narasumber tidak ditemukan.</p>
          <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
            Coba ubah filter atau kata kunci pencarian.
          </p>
        </div>
      ) : (
        <div className="surface overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama / Jabatan</th>
                <th>Bidang</th>
                <th>Instansi</th>
                <th>Terakhir Siaran</th>
                <th>Boleh Kembali</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((n) => {
                const last = getLastAppearance(n);
                const status = getNarasumberStatus(last);
                const sisa = getRemainingDays(last);
                const boleh = getCooldownEnd(last);
                return (
                  <tr
                    key={n.id}
                    tabIndex={0}
                    role="link"
                    onClick={() => router.push(`/narasumber/${n.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`/narasumber/${n.id}`);
                      }
                    }}
                    className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]"
                  >
                    <td>
                      <span className="font-semibold text-[var(--foreground)] hover:text-[var(--accent)]">
                        {n.nama}
                      </span>
                      {n.jabatan && (
                        <div className="mt-0.5 text-[12px] text-[var(--muted-foreground)]">
                          {n.jabatan}
                        </div>
                      )}
                    </td>
                    <td>{n.bidang}</td>
                    <td className="text-[var(--muted-foreground)]">{n.instansi}</td>
                    <td className="whitespace-nowrap">{formatDate(last)}</td>
                     <td className="whitespace-nowrap text-[var(--muted-foreground)]">
                       {status === "dalam-jeda"
                         ? `${formatDate(boleh!.toISOString())} · ${sisa} hr`
                         : status === "tersedia"
                         ? "Siap"
                         : "-"}
                     </td>
                    <td>
                      <StatusBadge status={status} sisa={status === "dalam-jeda" ? sisa : undefined} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-[12px] text-[var(--muted-foreground)]">
        Total data ditampilkan: {filtered.length} dari {narasumberList.length} narasumber.
      </p>
      </div>
    </div>
  );
}