"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useNarasumber } from "@/context/NarasumberContext";
import { useToast } from "@/context/ToastContext";
import { Field, inputClass, textareaClass } from "@/components/admin/AdminUI";
import {
  formatDate,
  getCooldownEnd,
  getLastAppearance,
  getNarasumberStatus,
  getRemainingDays,
  type JenisSiaran,
  type JadwalSiaran,
} from "@/types";

interface Props {
  existing?: JadwalSiaran | null;
  onClose: () => void;
}

export function JadwalFormModal({ existing, onClose }: Props) {
  const { narasumberList, jadwalList, addJadwal, updateJadwal, addLog } = useNarasumber();
  const { showToast } = useToast();

  const today = new Date().toISOString().slice(0, 10);
  const [narasumberId, setNarasumberId] = useState(existing?.narasumberId ?? "");
  const [tanggal, setTanggal] = useState(existing?.tanggal ?? today);
  const [waktu, setWaktu] = useState(existing?.waktu ?? "");
  const [program, setProgram] = useState(existing?.program ?? "");
  const [jenisSiaran, setJenisSiaran] = useState<JenisSiaran>(existing?.jenisSiaran ?? "live");
  const [topik, setTopik] = useState(existing?.topik ?? "");
  const [catatan, setCatatan] = useState(existing?.catatan ?? "");
  const [statusJadwal, setStatusJadwal] = useState(existing?.status ?? "dijadwalkan");
  const [overrideAlasan, setOverrideAlasan] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedNarasumber = narasumberList.find((n) => n.id === narasumberId);
  const last = selectedNarasumber ? getLastAppearance(selectedNarasumber) : null;
  const status = selectedNarasumber ? getNarasumberStatus(last) : null;
  const cooldownEnd = getCooldownEnd(last);
  const sisa = getRemainingDays(last);
  const isInJeda = status === "dalam-jeda";

  const hasDoubleBooking =
    !existing &&
    !!narasumberId &&
    !!tanggal &&
    jadwalList.some(
      (j) => j.narasumberId === narasumberId && j.tanggal === tanggal && j.status === "dijadwalkan"
    );

  const doSave = (withOverride = false) => {
    if (!narasumberId || !tanggal || !program.trim()) {
      showToast("Narasumber, Tanggal, dan Program wajib diisi.", "error");
      return;
    }
    if (withOverride && !overrideAlasan.trim()) {
      showToast("Harap isi alasan override.", "error");
      return;
    }
    setSaving(true);
    const nama = selectedNarasumber?.nama ?? "";
    if (existing) {
      updateJadwal(existing.id, {
        narasumberId,
        tanggal,
        waktu: waktu || undefined,
        program: program.trim(),
        jenisSiaran,
        topik: topik.trim() || undefined,
        catatan: catatan.trim() || undefined,
        status: statusJadwal,
      });
      addLog(`Edit jadwal: ${nama}`, `Tanggal: ${formatDate(tanggal)}, Program: ${program.trim()}, Status: ${statusJadwal}`);
      showToast(`Jadwal ${nama} berhasil diperbarui.`, "success");
    } else {
      addJadwal({
        narasumberId,
        tanggal,
        waktu: waktu || undefined,
        program: program.trim(),
        jenisSiaran,
        topik: topik.trim() || undefined,
        catatan: catatan.trim() || undefined,
      });
      const overrideNote = withOverride ? ` [OVERRIDE: ${overrideAlasan.trim()}]` : "";
      addLog(`Buat jadwal: ${nama}${overrideNote}`, `Tanggal: ${formatDate(tanggal)}, Program: ${program.trim()}`);
      showToast(`Jadwal ${nama} berhasil dibuat.`, "success");
    }
    setSaving(false);
    onClose();
  };

  const handleSubmit = () => {
    if (hasDoubleBooking) {
      showToast("Narasumber sudah memiliki jadwal pada tanggal tersebut.", "error");
      return;
    }
    if (isInJeda && !existing) {
      setShowOverride(true);
      return;
    }
    doSave(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div
        className="surface mx-auto my-0 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto p-5 shadow-md sm:my-4"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-center justify-between border-b border-[var(--border)] pb-3">
          <h2 className="text-[14px] font-semibold">
            {existing ? "Edit Jadwal" : "Buat Jadwal Siaran"}
          </h2>
        </header>

        {hasDoubleBooking && (
          <div className="mb-3 flex items-start gap-2 border border-[var(--danger)] bg-[#fbecec] p-2 text-[12px] text-[var(--danger)]">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>Narasumber sudah memiliki jadwal pada tanggal ini. Pilih tanggal lain atau narasumber lain.</span>
          </div>
        )}

        {isInJeda && narasumberId && !showOverride && (
          <div className="mb-3 flex items-start gap-2 border border-[var(--warning)] bg-[#fdf6e3] p-2 text-[12px] text-[var(--warning)]">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Narasumber masih dalam masa tunggu</p>
              <p>
                Terakhir tampil: <b>{formatDate(last)}</b> · Boleh kembali:{" "}
                <b>{cooldownEnd ? formatDate(cooldownEnd.toISOString()) : "—"}</b> · Sisa: {sisa} hari
              </p>
            </div>
          </div>
        )}

        {showOverride && (
          <div className="mb-3 border border-[var(--warning)] bg-[#fdf6e3] p-3 text-[12px]">
            <p className="font-semibold text-[var(--warning)]">Peringatan — Override Masa Tunggu</p>
            <p className="mt-1 text-[var(--foreground)]">
              Narasumber masih dalam masa tunggu ({sisa} hari lagi). Wajib berikan alasan override.
            </p>
            <textarea
              className={`mt-2 ${textareaClass}`}
              rows={2}
              placeholder="Contoh: Permintaan khusus dari produser untuk program spesial..."
              value={overrideAlasan}
              onChange={(e) => setOverrideAlasan(e.target.value)}
              autoFocus
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => doSave(true)}
                disabled={saving || !overrideAlasan.trim()}
                className="btn btn-primary !h-7 !px-2 !text-[11px]"
              >
                Lanjutkan Override
              </button>
              <button onClick={() => setShowOverride(false)} className="btn btn-outline !h-7 !px-2 !text-[11px]">
                Kembali
              </button>
            </div>
          </div>
        )}

        {!showOverride && (
          <>
            <div className="space-y-3">
              <Field label="Narasumber" required>
                <select className={inputClass} value={narasumberId} onChange={(e) => setNarasumberId(e.target.value)}>
                  <option value="">— Pilih narasumber —</option>
                  {narasumberList.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.nama} · {n.instansi}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Tanggal" required>
                  <input type="date" className={inputClass} value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
                </Field>
                <Field label="Waktu (WITA)">
                  <input type="time" className={inputClass} value={waktu} onChange={(e) => setWaktu(e.target.value)} />
                </Field>
              </div>
              <Field label="Nama Program / Acara" required>
                <input
                  className={inputClass}
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  placeholder="Dialog Pagi, Siaran Berita, dll."
                />
              </Field>
              <Field label="Jenis Siaran" required>
                <select className={inputClass} value={jenisSiaran} onChange={(e) => setJenisSiaran(e.target.value as JenisSiaran)}>
                  <option value="live">Live</option>
                  <option value="rekaman">Rekaman</option>
                </select>
              </Field>
              {existing && (
                <Field label="Status Jadwal">
                  <select
                    className={inputClass}
                    value={statusJadwal}
                    onChange={(e) => setStatusJadwal(e.target.value as typeof statusJadwal)}
                  >
                    <option value="dijadwalkan">Dijadwalkan (Aktif)</option>
                    <option value="ditunda">Ditunda</option>
                    <option value="dibatalkan">Dibatalkan</option>
                    <option value="sudah-tampil">Sudah Tampil</option>
                  </select>
                </Field>
              )}
              <Field label="Topik">
                <input
                  className={inputClass}
                  value={topik}
                  onChange={(e) => setTopik(e.target.value)}
                  placeholder="Topik pembahasan"
                />
              </Field>
              <Field label="Catatan">
                <textarea
                  className={textareaClass}
                  rows={2}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Catatan tambahan..."
                />
              </Field>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
              <button onClick={onClose} className="btn btn-outline w-full sm:w-auto">
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !!hasDoubleBooking}
                className="btn btn-primary w-full sm:w-auto"
              >
                {saving ? "Menyimpan..." : existing ? "Simpan Perubahan" : "Buat Jadwal"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}