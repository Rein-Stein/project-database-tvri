"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Pencil,
  PlusCircle,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { useNarasumber } from "@/context/NarasumberContext";
import {
  formatDate,
  getCooldownEnd,
  getLastAppearance,
  getNarasumberStatus,
  getRemainingDays,
  type Narasumber,
  type NarasumberStatus,
} from "@/types";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSubNav } from "@/components/admin/AdminUI";
import { StatusBadge } from "@/components/StatusBadge";
import { NarasumberFormModal } from "@/components/admin/NarasumberFormModal";
import { CatatSiaranModal } from "@/components/admin/CatatSiaranModal";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

type FilterStatus = "semua" | NarasumberStatus;

export default function AdminNarasumberPage() {
  return (
    <AdminGuard>
      <NarasumberContent />
    </AdminGuard>
  );
}

function NarasumberContent() {
  const { narasumberList, removeNarasumber, resetKehadiran, addLog } = useNarasumber();
  const { showToast } = useToast();

  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("semua");
  const [instansiFilter, setInstansiFilter] = useState("semua");
  const [showForm, setShowForm] = useState(false);
  const [editNarasumber, setEditNarasumber] = useState<Narasumber | null>(null);
  const [catatTarget, setCatatTarget] = useState<Narasumber | null>(null);

  const instansiList = useMemo(
    () => Array.from(new Set(narasumberList.map((n) => n.instansi))).sort(),
    [narasumberList]
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return narasumberList
      .filter((n) => {
        const last = getLastAppearance(n);
        const st = getNarasumberStatus(last);
        if (filterStatus !== "semua" && st !== filterStatus) return false;
        if (instansiFilter !== "semua" && n.instansi !== instansiFilter) return false;
        if (!q) return true;
        return (
          n.nama.toLowerCase().includes(q) ||
          n.instansi.toLowerCase().includes(q) ||
          n.bidang.toLowerCase().includes(q) ||
          (n.jabatan ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [narasumberList, query, filterStatus, instansiFilter]);

  const existingNames = narasumberList.map((n) => n.nama);

  const handleHapus = (n: Narasumber) => {
    if (!confirm(`Hapus narasumber "${n.nama}" beserta seluruh riwayat siarannya?`)) return;
    removeNarasumber(n.id);
    addLog(`Hapus narasumber: ${n.nama}`);
    showToast(`Narasumber ${n.nama} dihapus.`, "info");
  };

  const handleReset = (n: Narasumber) => {
    if (!confirm(`Reset seluruh riwayat siaran "${n.nama}"? Data tidak dapat dikembalikan.`))
      return;
    resetKehadiran(n.id);
    addLog(`Reset riwayat: ${n.nama}`);
    showToast(`Riwayat ${n.nama} direset.`, "info");
  };

  const filterOptions: { key: FilterStatus; label: string }[] = [
    { key: "semua", label: "Semua" },
    { key: "tersedia", label: "Boleh Diundang" },
    { key: "dalam-jeda", label: "Dalam Masa Tunggu" },
    { key: "belum-tampil", label: "Belum Pernah Tampil" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
      <div className="mb-5 flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[20px] font-semibold">Manajemen Narasumber</h1>
          <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
            Tambah, edit, catat siaran, dan kelola data narasumber TVRI Kaltim.
          </p>
        </div>
        <button
          onClick={() => {
            setEditNarasumber(null);
            setShowForm(true);
          }}
          className="btn btn-primary"
        >
          <PlusCircle size={14} /> Tambah Narasumber
        </button>
      </div>

      <AdminSubNav />

      <div className="mb-4 flex flex-wrap items-center gap-1">
        {filterOptions.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={cn(
              "btn-focus px-2 py-1 text-[12px] font-medium border-b-2 transition-colors",
              filterStatus === f.key
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama, jabatan, instansi..."
            className="field-input pl-7"
          />
        </div>
        <select
          value={instansiFilter}
          onChange={(e) => setInstansiFilter(e.target.value)}
          className="field-input"
          aria-label="Filter instansi"
        >
          <option value="semua">Semua Instansi</option>
          {instansiList.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
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
                <th>Terakhir Tampil</th>
                <th>Boleh Kembali</th>
                <th>Riwayat</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((n) => {
                const last = getLastAppearance(n);
                const st = getNarasumberStatus(last);
                const sisa = getRemainingDays(last);
                const boleh = getCooldownEnd(last);
                return (
                  <tr key={n.id}>
                    <td>
                      <Link
                        href={`/narasumber/${n.id}`}
                        className="font-semibold hover:text-[var(--accent)] hover:underline"
                      >
                        {n.nama}
                      </Link>
                      {n.jabatan && (
                        <div className="text-[12px] text-[var(--muted-foreground)]">
                          {n.jabatan}
                        </div>
                      )}
                    </td>
                    <td>{n.bidang}</td>
                    <td className="text-[var(--muted-foreground)]">
                      {n.instansi}
                      {n.phone && (
                        <div className="text-[12px]">{n.phone}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap">{formatDate(last)}</td>
                     <td className="whitespace-nowrap text-[var(--muted-foreground)]">
                       {st === "dalam-jeda"
                         ? `${formatDate(boleh!.toISOString())} · ${sisa} hr`
                         : st === "tersedia"
                         ? "Siap"
                         : "-"}
                     </td>
                    <td>{n.riwayat?.length ?? 0}x</td>
                    <td>
                      <StatusBadge status={st} sisa={st === "dalam-jeda" ? sisa : undefined} />
                    </td>
                    <td className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <button
                          onClick={() => setCatatTarget(n)}
                          className="btn btn-primary !h-7 !px-2 !text-[11px]"
                          title="Catat Siaran"
                        >
                          <CalendarCheck size={12} /> Catat
                        </button>
                        <button
                          onClick={() => {
                            setEditNarasumber(n);
                            setShowForm(true);
                          }}
                          className="btn btn-outline !h-7 !px-2 !text-[11px]"
                          title="Edit"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleReset(n)}
                          className="btn btn-outline !h-7 !px-2 !text-[11px]"
                          title="Reset Riwayat"
                        >
                          <RotateCcw size={12} />
                        </button>
                        <button
                          onClick={() => handleHapus(n)}
                          className="btn btn-danger !h-7 !px-2 !text-[11px]"
                          title="Hapus"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-[12px] text-[var(--muted-foreground)]">
        Menampilkan {filtered.length} dari {narasumberList.length} narasumber.
      </p>

      {showForm && (
        <NarasumberFormModal
          existing={editNarasumber}
          existingNames={existingNames}
          onClose={() => {
            setShowForm(false);
            setEditNarasumber(null);
          }}
        />
      )}

      {catatTarget && (
        <CatatSiaranModal narasumber={catatTarget} onClose={() => setCatatTarget(null)} />
      )}
    </div>
  );
}