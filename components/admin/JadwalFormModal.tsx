"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useNarasumber } from "@/context/NarasumberContext";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { Field, inputClass, textareaClass } from "@/components/admin/AdminUI";
import {
  collectPenampilan,
  describeRotationConflict,
  findRotationConflict,
  toIsoDate,
  formatDate,
  isJadwalSelesai,
  normalizeProgramName,
  type JenisSiaran,
  type JadwalSiaran,
} from "@/types";

interface Props {
  existing?: JadwalSiaran | null;
  onClose: () => void;
}

export function JadwalFormModal({ existing, onClose }: Props) {
  const { narasumberList, jadwalList, programList, addJadwal, updateJadwal, addLog } = useNarasumber();
  const { user } = useAuth();
  const { showToast } = useToast();

  const today = toIsoDate(new Date());
  const [narasumberId, setNarasumberId] = useState(existing?.narasumberId ?? "");
  const [tanggal, setTanggal] = useState(existing?.tanggal ?? today);
  const [waktu, setWaktu] = useState(existing?.waktu ?? "");
  const [programId, setProgramId] = useState(existing?.programId ?? "");
  const [jenisSiaran, setJenisSiaran] = useState<JenisSiaran>(existing?.jenisSiaran ?? "live");
  const [topik, setTopik] = useState(existing?.topik ?? "");
  const [catatan, setCatatan] = useState(existing?.catatan ?? "");
  const [statusJadwal, setStatusJadwal] = useState(existing?.status ?? "dijadwalkan");
  const [overrideAlasan, setOverrideAlasan] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const selectedNarasumber = narasumberList.find((n) => n.id === narasumberId);
  const selectedProgram = programList.find((item) => item.id === programId);
  const activePrograms = programList.filter((item) => item.aktif);
  const isOperator = user?.role === "operator";
  const checksWaitingPeriod = !existing || statusJadwal === "dijadwalkan";

  useEffect(() => {
    if (!existing || existing.programId || programId || programList.length === 0) return;
    const matched = programList.find((item) => normalizeProgramName(item.nama) === normalizeProgramName(existing.program));
    if (matched) setProgramId(matched.id);
  }, [existing, programId, programList]);

  const rotationConflict =
    checksWaitingPeriod && selectedNarasumber && tanggal && selectedProgram
      ? findRotationConflict(
          tanggal,
          collectPenampilan(selectedNarasumber, jadwalList),
          undefined,
          existing ? [`jadwal-${existing.id}`] : [],
          {
            aturanJeda: selectedNarasumber.aturanJeda,
            programId: selectedProgram.id,
            programNama: selectedProgram.nama,
          }
        )
      : null;
  const rotationMessage = rotationConflict
    ? describeRotationConflict(rotationConflict, undefined, selectedNarasumber?.nama)
    : "";

  const doSave = async (withOverride = false) => {
    if (!narasumberId || !tanggal || !selectedProgram) {
      showToast("Narasumber, Tanggal, dan Program wajib diisi.", "error");
      return;
    }
    if (withOverride && !overrideAlasan.trim()) {
      showToast("Harap isi alasan override.", "error");
      return;
    }
    if (withOverride && user?.role !== "admin") {
      showToast("Hanya Admin yang dapat memberikan override masa tunggu.", "error");
      return;
    }
    setSaving(true);
    const nama = selectedNarasumber?.nama ?? "";
    if (user?.role === "operator") {
      try {
        const res = await fetch("/api/change-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType: existing ? "jadwal_siaran_update" : "jadwal_siaran_create",
            ...(existing ? { entityId: existing.id } : {}),
            dataBaru: {
              narasumberId,
              tanggal,
              waktu,
              program: selectedProgram.nama,
              programId: selectedProgram.id,
              jenisSiaran,
              topik: topik.trim(),
              catatan: catatan.trim(),
              status: existing ? statusJadwal : "dijadwalkan",
              tanggalBaru: existing?.tanggalBaru ?? "",
            },
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showToast(data.message ?? "Pengajuan perubahan jadwal gagal.", "error");
          return;
        }
        showToast("Perubahan jadwal diajukan dan menunggu persetujuan Admin.", "success");
        onClose();
        return;
      } catch {
        showToast("Pengajuan gagal dikirim. Periksa koneksi lalu coba lagi.", "error");
        return;
      } finally {
        setSaving(false);
      }
    }
    if (existing) {
      updateJadwal(existing.id, {
        narasumberId,
        tanggal,
        waktu: waktu || undefined,
        program: selectedProgram.nama,
        programId: selectedProgram.id,
        jenisSiaran,
        topik: topik.trim() || undefined,
        catatan: catatan.trim() || undefined,
        status: statusJadwal,
      });
      const overrideNote = withOverride ? ` [OVERRIDE: ${overrideAlasan.trim()}]` : "";
      addLog(`Edit jadwal: ${nama}${overrideNote}`, `Tanggal: ${formatDate(tanggal)}, Program: ${selectedProgram.nama}, Status: ${statusJadwal}`);
      showToast(`Jadwal ${nama} berhasil diperbarui.`, "success");
    } else {
      addJadwal({
        narasumberId,
        tanggal,
        waktu: waktu || undefined,
        program: selectedProgram.nama,
        programId: selectedProgram.id,
        jenisSiaran,
        topik: topik.trim() || undefined,
        catatan: catatan.trim() || undefined,
      });
      const overrideNote = withOverride ? ` [OVERRIDE: ${overrideAlasan.trim()}]` : "";
      addLog(`Buat jadwal: ${nama}${overrideNote}`, `Tanggal: ${formatDate(tanggal)}, Program: ${selectedProgram.nama}`);
      showToast(`Jadwal ${nama} berhasil dibuat.`, "success");
    }
    setSaving(false);
    onClose();
  };

  const handleSubmit = () => {
    if (statusJadwal === "sudah-tampil" && !isJadwalSelesai({ tanggal, waktu })) {
      showToast("Jadwal belum melewati waktu tayang sehingga belum dapat ditandai sudah tampil.", "error");
      return;
    }
    if (rotationConflict) {
      if (isOperator) {
        showToast("Jadwal melanggar masa tunggu. Hubungi Admin jika perlu pengecualian.", "error");
        return;
      }
      setShowOverride(true);
      return;
    }
    doSave(false);
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div
        className="surface mx-auto my-8 max-h-[calc(100vh-4rem)] w-full max-w-md overflow-y-auto p-5 shadow-md"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-center justify-between border-b border-[var(--border)] pb-3">
          <h2 className="text-[14px] font-semibold">
            {existing ? "Edit Jadwal" : "Buat Jadwal Siaran"}
          </h2>
        </header>

        {rotationConflict && !showOverride && (
          <div className="mb-3 flex items-start gap-2 border border-[var(--warning)] bg-[#fdf6e3] p-2 text-[12px] text-[var(--warning)]">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Jadwal ini melanggar masa tunggu narasumber</p>
              <p>{rotationMessage}</p>
              {isOperator && <p className="mt-1">Hubungi Admin jika perlu pengecualian.</p>}
            </div>
          </div>
        )}

        {showOverride && (
          <div className="mb-3 border border-[var(--warning)] bg-[#fdf6e3] p-3 text-[12px]">
            <p className="font-semibold text-[var(--warning)]">Peringatan — Override Masa Tunggu</p>
            <p className="mt-1 text-[var(--foreground)]">
              {rotationMessage} Wajib berikan alasan override.
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
                disabled={saving || !overrideAlasan.trim() || user?.role !== "admin"}
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
              <Field label="Program" required>
                <select className={inputClass} value={programId} onChange={(event) => setProgramId(event.target.value)}>
                  <option value="">— Pilih program —</option>
                  {programList.filter((item) => item.aktif || item.id === programId).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nama}{item.aktif ? "" : " (nonaktif)"}
                    </option>
                  ))}
                </select>
              </Field>
              {activePrograms.length === 0 && (
                <p className="text-[12px] text-[var(--muted-foreground)]">
                  Belum ada program aktif.
                  {user?.role === "admin" && <> <Link href="/admin/program" className="font-semibold text-[var(--accent)] hover:underline">Kelola Program</Link></>}
                </p>
              )}
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
                    <option value="sudah-tampil" disabled={!isJadwalSelesai({ tanggal, waktu })}>Sudah Tampil</option>
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
                disabled={saving}
                className="btn btn-primary w-full sm:w-auto"
              >
                {saving ? "Menyimpan..." : existing && user?.role === "operator" ? "Ajukan Perubahan" : existing ? "Simpan Perubahan" : "Buat Jadwal"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
