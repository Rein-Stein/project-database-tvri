"use client";

import { useMemo, useState } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  Pencil,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import { useNarasumber } from "@/context/NarasumberContext";
import {
  formatDate,
  type JadwalSiaran,
  type JadwalStatus,
} from "@/types";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSubNav, JadwalBadge } from "@/components/admin/AdminUI";
import { JadwalFormModal } from "@/components/admin/JadwalFormModal";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

type FilterStatus = "semua" | JadwalStatus;

export default function JadwalPage() {
  return (
    <AdminGuard>
      <JadwalContent />
    </AdminGuard>
  );
}

function JadwalContent() {
  const { narasumberList, jadwalList, setJadwalStatus, removeJadwal, tandaiJadwalTampil, addLog } =
    useNarasumber();
  const { showToast } = useToast();

  const [filterStatus, setFilterStatus] = useState<FilterStatus>("semua");
  const [filterPeriode, setFilterPeriode] = useState("semua");
  const [showForm, setShowForm] = useState(false);
  const [editJadwal, setEditJadwal] = useState<JadwalSiaran | null>(null);
  const [undaTanggal, setUndaTanggal] = useState<{ id: string; val: string } | null>(null);

  const getNama = (id: string) => narasumberList.find((n) => n.id === id)?.nama ?? "-";
  const getInstansi = (id: string) =>
    narasumberList.find((n) => n.id === id)?.instansi ?? "";

  const filtered = useMemo(() => {
    const today = new Date();
    const startOf = (offset: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - offset);
      return d.toISOString().slice(0, 10);
    };

    const periodeStartMap: Record<string, string> = {
      semua: "0000-01-01",
      hari_ini: today.toISOString().slice(0, 10),
      minggu_ini: startOf(7),
      bulan_ini: startOf(30),
      tiga_bulan: startOf(90),
    };

    const start = periodeStartMap[filterPeriode] ?? "0000-01-01";
    return jadwalList
      .filter((j) => {
        if (filterStatus !== "semua" && j.status !== filterStatus) return false;
        if (j.tanggal < start) return false;
        return true;
      })
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [jadwalList, filterStatus, filterPeriode]);

  const handleTandaiTampil = (j: JadwalSiaran) => {
    const waitingSummary = "periode jeda yang diatur admin";
    if (
      !confirm(
        `Tandai ${getNama(j.narasumberId)} sudah tampil pada ${formatDate(j.tanggal)}?\n\nIni akan membuat riwayat siaran dan memulai ulang ${waitingSummary}.`
      )
    )
      return;
    tandaiJadwalTampil(j.id);
    addLog(`Tandai sudah tampil: ${getNama(j.narasumberId)}`, `Jadwal: ${j.id}, Tanggal: ${formatDate(j.tanggal)}`);
    showToast(`${getNama(j.narasumberId)} ditandai sudah tampil. Masa tunggu baru dimulai.`, "success");
  };

  const handleBatalkan = (j: JadwalSiaran) => {
    if (!confirm(`Batalkan jadwal ${getNama(j.narasumberId)} pada ${formatDate(j.tanggal)}?`)) return;
    setJadwalStatus(j.id, "dibatalkan");
    addLog(`Batalkan jadwal: ${getNama(j.narasumberId)}`, `Tanggal: ${formatDate(j.tanggal)}`);
    showToast(`Jadwal ${getNama(j.narasumberId)} dibatalkan.`, "info");
  };

  const handleTunda = (j: JadwalSiaran) => {
    setUndaTanggal({ id: j.id, val: j.tanggal });
  };

  const konfirmasiTunda = (jadwalId: string, tanggalBaru: string) => {
    if (!tanggalBaru) return;
    setJadwalStatus(jadwalId, "ditunda", { tanggalBaru });
    const n = jadwalList.find((j) => j.id === jadwalId);
    addLog(`Tunda jadwal: ${getNama(n?.narasumberId ?? "")}`, `Tanggal baru: ${formatDate(tanggalBaru)}`);
    showToast("Jadwal ditunda ke tanggal baru.", "info");
    setUndaTanggal(null);
  };

  const handleAktifkanKembali = (j: JadwalSiaran) => {
    setJadwalStatus(j.id, "dijadwalkan");
    addLog(`Aktifkan kembali jadwal: ${getNama(j.narasumberId)}`, `Tanggal: ${formatDate(j.tanggal)}`);
    showToast(`Jadwal ${getNama(j.narasumberId)} diaktifkan kembali.`, "success");
  };

  const handleLanjutkanSiaran = (j: JadwalSiaran) => {
    const tgl = j.tanggalBaru || j.tanggal;
    setJadwalStatus(j.id, "dijadwalkan", j.tanggalBaru ? { tanggalBaru: j.tanggalBaru } : undefined);
    addLog(`Lanjutkan siaran: ${getNama(j.narasumberId)}`, `Jadwal aktif untuk tanggal: ${formatDate(tgl)}`);
    showToast(`Jadwal siaran ${getNama(j.narasumberId)} dilanjutkan untuk tanggal ${formatDate(tgl)}.`, "success");
  };

  const handleHapus = (j: JadwalSiaran) => {
    if (!confirm("Hapus jadwal ini secara permanen?")) return;
    removeJadwal(j.id);
    addLog(`Hapus jadwal: ${getNama(j.narasumberId)}`, `Tanggal: ${formatDate(j.tanggal)}`);
    showToast("Jadwal dihapus.", "info");
  };

  const filterOptions: { key: FilterStatus; label: string }[] = [
    { key: "semua", label: "Semua" },
    { key: "dijadwalkan", label: "Dijadwalkan" },
    { key: "sudah-tampil", label: "Sudah Tampil" },
    { key: "dibatalkan", label: "Dibatalkan" },
    { key: "ditunda", label: "Ditunda" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
      <div className="mb-5 flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[20px] font-semibold">Jadwal Siaran</h1>
          <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
            Kelola seluruh jadwal narasumber siaran TVRI Kaltim.
          </p>
        </div>
        <button
          onClick={() => {
            setEditJadwal(null);
            setShowForm(true);
          }}
          className="btn btn-primary"
        >
          <CalendarPlus size={14} /> Buat Jadwal Baru
        </button>
      </div>

      <AdminSubNav />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1">
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
        <select
          value={filterPeriode}
          onChange={(e) => setFilterPeriode(e.target.value)}
          className="field-input sm:w-56"
          aria-label="Filter periode"
        >
          <option value="semua">Semua Periode</option>
          <option value="hari_ini">Hari Ini</option>
          <option value="minggu_ini">7 Hari Terakhir</option>
          <option value="bulan_ini">30 Hari Terakhir</option>
          <option value="tiga_bulan">3 Bulan Terakhir</option>
        </select>
      </div>

      {undaTanggal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="surface w-full max-w-sm p-5">
            <h3 className="mb-3 text-[14px] font-semibold">Tunda Jadwal — Pilih Tanggal Baru</h3>
            <input
              type="date"
              className="field-input"
              defaultValue={undaTanggal.val}
              onChange={(e) => setUndaTanggal({ ...undaTanggal, val: e.target.value })}
            />
            <div className="mt-4 flex justify-end gap-2 border-t border-[var(--border)] pt-4">
              <button onClick={() => setUndaTanggal(null)} className="btn btn-outline">
                Batal
              </button>
              <button
                onClick={() => konfirmasiTunda(undaTanggal.id, undaTanggal.val)}
                className="btn btn-primary"
              >
                Simpan Tanggal Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="surface py-10 text-center">
          <p className="font-semibold">Tidak ada jadwal ditemukan.</p>
          <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
            Coba ubah filter atau buat jadwal baru.
          </p>
        </div>
      ) : (
        <div className="surface overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Narasumber / Instansi</th>
                <th>Program</th>
                <th>Topik</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((j) => (
                <tr key={j.id}>
                  <td className="whitespace-nowrap font-semibold">
                    {formatDate(j.tanggal)}
                    {j.status === "ditunda" && j.tanggalBaru && (
                      <div className="mt-0.5 text-[12px] font-normal text-[var(--muted-foreground)]">
                        → {formatDate(j.tanggalBaru)}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="font-semibold">{getNama(j.narasumberId)}</div>
                    <div className="text-[12px] text-[var(--muted-foreground)]">
                      {getInstansi(j.narasumberId)}
                    </div>
                  </td>
                  <td>
                    {j.program}
                    {j.waktu && (
                      <div className="text-[12px] text-[var(--muted-foreground)]">
                        {j.waktu} WITA
                      </div>
                    )}
                    {j.catatan && (
                      <div className="mt-0.5 text-[12px] italic text-[var(--muted-foreground)]">
                        “{j.catatan}”
                      </div>
                    )}
                  </td>
                  <td className="text-[var(--muted-foreground)]">{j.topik || "-"}</td>                  <td>
                    <JadwalBadge status={j.status} />
                  </td>
                  <td className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      {j.status === "dijadwalkan" && (
                        <>
                          <button
                            onClick={() => handleTandaiTampil(j)}
                            title="Tandai Sudah Tampil"
                            className="btn btn-primary !h-7 !px-2 !text-[11px]"
                          >
                            <CheckCircle2 size={12} /> Tampil
                          </button>
                          <button
                            onClick={() => {
                              setEditJadwal(j);
                              setShowForm(true);
                            }}
                            title="Edit Jadwal"
                            className="btn btn-outline !h-7 !px-2 !text-[11px]"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => handleTunda(j)}
                            title="Tunda Jadwal"
                            className="btn btn-outline !h-7 !px-2 !text-[11px]"
                          >
                            <PauseCircle size={12} />
                          </button>
                          <button
                            onClick={() => handleBatalkan(j)}
                            title="Batalkan Jadwal"
                            className="btn btn-outline !h-7 !px-2 !text-[11px]"
                          >
                            <XCircle size={12} />
                          </button>
                        </>
                      )}

                      {j.status === "ditunda" && (
                        <>
                          <button
                            onClick={() => handleLanjutkanSiaran(j)}
                            className="btn btn-primary !h-7 !px-2 !text-[11px]"
                          >
                            <PlayCircle size={12} /> Lanjutkan
                          </button>
                          <button
                            onClick={() => handleTunda(j)}
                            className="btn btn-outline !h-7 !px-2 !text-[11px]"
                          >
                            Ubah Tanggal
                          </button>
                          <button
                            onClick={() => {
                              setEditJadwal(j);
                              setShowForm(true);
                            }}
                            className="btn btn-outline !h-7 !px-2 !text-[11px]"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => handleBatalkan(j)}
                            className="btn btn-outline !h-7 !px-2 !text-[11px]"
                          >
                            <XCircle size={12} />
                          </button>
                          <button
                            onClick={() => handleHapus(j)}
                            className="btn btn-danger !h-7 !px-2 !text-[11px]"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}

                      {j.status === "dibatalkan" && (
                        <>
                          <button
                            onClick={() => handleAktifkanKembali(j)}
                            className="btn btn-primary !h-7 !px-2 !text-[11px]"
                          >
                            <RotateCcw size={12} /> Aktifkan
                          </button>
                          <button
                            onClick={() => {
                              setEditJadwal(j);
                              setShowForm(true);
                            }}
                            className="btn btn-outline !h-7 !px-2 !text-[11px]"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => handleHapus(j)}
                            className="btn btn-danger !h-7 !px-2 !text-[11px]"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}

                      {j.status === "sudah-tampil" && (
                        <>
                          <button
                            onClick={() => {
                              setEditJadwal(j);
                              setShowForm(true);
                            }}
                            className="btn btn-outline !h-7 !px-2 !text-[11px]"
                          >
                            <Pencil size={12} /> Edit
                          </button>
                          <button
                            onClick={() => handleHapus(j)}
                            className="btn btn-danger !h-7 !px-2 !text-[11px]"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-[12px] text-[var(--muted-foreground)]">
        Menampilkan {filtered.length} dari {jadwalList.length} jadwal.
      </p>

      {showForm && (
        <JadwalFormModal
          existing={editJadwal}
          onClose={() => {
            setShowForm(false);
            setEditJadwal(null);
          }}
        />
      )}
    </div>
  );
}