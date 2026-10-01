"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNarasumber } from "@/context/NarasumberContext";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { Field, inputClass, textareaClass } from "@/components/admin/AdminUI";
import {
  formatDate,
  getCooldownEnd,
  isJadwalSelesai,
  getLastAppearance,
  getNarasumberStatus,
  type JadwalSiaran,
  type Narasumber,
} from "@/types";

interface Props {
  narasumber: Narasumber;
  jadwal?: JadwalSiaran;
  onClose: () => void;
}

export function CatatSiaranModal({ narasumber, jadwal, onClose }: Props) {
  const { jadwalList } = useNarasumber();
  const { user } = useAuth();
  const { showToast } = useToast();

  const today = new Date().toISOString().slice(0, 10);
  const [selectedJadwalId, setSelectedJadwalId] = useState(jadwal?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const last = getLastAppearance(narasumber);
  const status = getNarasumberStatus(last);
  // Hanya jadwal milik narasumber ini yang BELUM tercatat di riwayat.
  // Jadwal yang dibatalkan tidak dapat dicatat, dan jadwal masa depan
  // belum boleh dicatat — riwayat hanya untuk siaran yang sudah terlaksana.
  const availableSchedules = jadwalList.filter((jadwal) =>
    jadwal.narasumberId === narasumber.id
    && jadwal.status !== "dibatalkan"
    && !narasumber.riwayat.some((history) => history.id === `jadwal-${jadwal.id}` || history.jadwalId === jadwal.id)
    && isJadwalSelesai(jadwal)
  );
  const selectedSchedule = jadwal ?? availableSchedules.find((item) => item.id === selectedJadwalId);

  const handleSubmit = async () => {
    if (!selectedSchedule) {
      showToast("Pilih jadwal yang akan dicatat.", "error");
      return;
    }
    if (!isJadwalSelesai(selectedSchedule)) {
      showToast("Siaran belum berlangsung sehingga belum dapat dicatat.", "error");
      return;
    }
    setSaving(true);

    try {
      if (user?.role === "operator") {
        const response = await fetch("/api/change-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType: "jadwal_siaran_update",
            entityId: selectedSchedule.id,
            dataBaru: {
              narasumberId: selectedSchedule.narasumberId,
              tanggal: selectedSchedule.tanggal,
              waktu: selectedSchedule.waktu ?? "",
              program: selectedSchedule.program,
              jenisSiaran: selectedSchedule.jenisSiaran ?? "live",
              topik: selectedSchedule.topik ?? "",
              catatan: selectedSchedule.catatan ?? "",
              status: "sudah-tampil",
              tanggalBaru: selectedSchedule.tanggalBaru ?? "",
            },
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message ?? "Pengajuan pencatatan gagal.");
        showToast("Pengajuan pencatatan siaran menunggu persetujuan Admin.", "success");
        onClose();
        return;
      }

      const response = await fetch("/api/siaran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narasumberId: narasumber.id, jadwalId: selectedSchedule.id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message ?? "Catatan siaran gagal disimpan.");
      const cooldownEnd = getCooldownEnd(selectedSchedule.tanggal);
      showToast(result.alreadyRecorded
        ? "Siaran ini sudah tercatat sebelumnya."
        : `Siaran ${narasumber.nama} berhasil dicatat. ${cooldownEnd ? `Boleh diundang kembali: ${formatDate(cooldownEnd.toISOString())}.` : ""}`, "success");
      onClose();
      window.location.reload();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal menyimpan catatan siaran.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div
        className="surface mx-auto my-8 max-h-[calc(100vh-4rem)] w-full max-w-md overflow-y-auto p-5 shadow-md"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 border-b border-[var(--border)] pb-3">
          <h2 className="text-[14px] font-semibold">Catat Siaran</h2>
          <p className="text-[12px] text-[var(--muted-foreground)]">
            {narasumber.nama} · {narasumber.instansi}
          </p>
        </header>

        <div className="mb-3">
          <select
            className={inputClass}
            value={selectedJadwalId}
            disabled={Boolean(jadwal)}
            onChange={(event) => {
              const nextId = event.target.value;
              setSelectedJadwalId(nextId);
            }}
            aria-label="Pilih jadwal terkait"
          >
            <option value="">Pilih jadwal yang sudah berlangsung</option>
            {availableSchedules.map((schedule) => (
              <option key={schedule.id} value={schedule.id}>
                {formatDate(schedule.tanggal)} · {schedule.waktu || "-"} · {schedule.program}
              </option>
            ))}
          </select>
        </div>

        {selectedSchedule && <p className="mb-3 border-l-2 border-[var(--accent)] pl-3 text-[12px] text-[var(--muted-foreground)]">
          Menggunakan data jadwal {selectedSchedule.id}; tanggal, program, dan detail siaran akan diambil dari jadwal tersebut.
        </p>}
        {availableSchedules.length === 0 && !jadwal && jadwalList.some((item) =>
          item.narasumberId === narasumber.id && item.status === "dijadwalkan"
        ) && <p className="mb-3 border-l-2 border-[var(--warning)] pl-3 text-[12px] text-[var(--muted-foreground)]">
          Jadwal untuk narasumber ini sudah dibuat, tetapi waktunya belum terlaksana. Catat siaran hanya setelah waktu tayang terlewat.
        </p>}

        {status === "dalam-jeda" && (
          <div className="mb-3 border border-[var(--warning)] bg-[#fdf6e3] p-2 text-[12px] text-[var(--warning)]">
            Narasumber ini sedang dalam masa tunggu. Terakhir tampil: <b>{formatDate(last)}</b>
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Tanggal Siaran" required>
              <input type="date" className={inputClass} value={selectedSchedule?.tanggal ?? today} disabled />
            </Field>
            <Field label="Waktu (WITA)">
              <input type="time" className={inputClass} value={selectedSchedule?.waktu ?? ""} disabled />
            </Field>
          </div>
          <Field label="Nama Program / Acara" required>
            <input
              className={inputClass}
              value={selectedSchedule?.program ?? ""}
              disabled
            />
          </Field>
          <Field label="Jenis Siaran" required>
            <select className={inputClass} value={selectedSchedule?.jenisSiaran ?? "live"} disabled>
              <option value="live">Live</option>
              <option value="rekaman">Rekaman</option>
            </select>
          </Field>
          <Field label="Topik Pembahasan">
            <input
              className={inputClass}
              value={selectedSchedule?.topik ?? ""}
              disabled
            />
          </Field>
          <Field label="Catatan Tambahan">
            <textarea
              className={textareaClass}
              rows={2}
              value={selectedSchedule?.catatan ?? ""}
              disabled
            />
          </Field>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
          <button onClick={onClose} className="btn btn-outline w-full sm:w-auto">
            Batal
          </button>
          <button onClick={handleSubmit} disabled={saving} className="btn btn-primary w-full sm:w-auto">
            {saving ? "Menyimpan..." : user?.role === "operator" ? "Ajukan Pencatatan" : "Catat dari Jadwal"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
