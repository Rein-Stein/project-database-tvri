"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNarasumber } from "@/context/NarasumberContext";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { Field, inputClass, textareaClass } from "@/components/admin/AdminUI";
import { PlusCircle } from "lucide-react";
import {
  formatDate,
  getCooldownEnd,
  isJadwalSelesai,
  getLastAppearance,
  getNarasumberStatus,
  type JenisSiaran,
  type Narasumber,
} from "@/types";

interface Props {
  narasumber: Narasumber;
  onClose: () => void;
}

export function CatatSiaranModal({ narasumber, onClose }: Props) {
  const { jadwalList } = useNarasumber();
  const { user } = useAuth();
  const { showToast } = useToast();

  const today = new Date().toISOString().slice(0, 10);
  const [tanggal, setTanggal] = useState(today);
  const [waktu, setWaktu] = useState("");
  const [program, setProgram] = useState("");
  const [jenisSiaran, setJenisSiaran] = useState<JenisSiaran>("live");
  const [topik, setTopik] = useState("");
  const [catatan, setCatatan] = useState("");
  const [selectedJadwalId, setSelectedJadwalId] = useState("");
  const [createSchedule, setCreateSchedule] = useState(false);
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
  const selectedSchedule = availableSchedules.find((jadwal) => jadwal.id === selectedJadwalId);

  const handleSubmit = async () => {
    if (!tanggal || !program.trim()) {
      showToast("Tanggal dan Program wajib diisi.", "error");
      return;
    }
    setSaving(true);
    const data = selectedSchedule ? {
      narasumberId: selectedSchedule.narasumberId,
      tanggal: selectedSchedule.tanggal,
      waktu: selectedSchedule.waktu ?? "",
      program: selectedSchedule.program,
      jenisSiaran: selectedSchedule.jenisSiaran ?? "live",
      topik: selectedSchedule.topik ?? "",
      catatan: selectedSchedule.catatan ?? "",
    } : {
      narasumberId: narasumber.id,
      tanggal,
      waktu,
      program: program.trim(),
      jenisSiaran,
      topik: topik.trim(),
      catatan: catatan.trim(),
    };
    const requestData = { ...data, status: "sudah-tampil", tanggalBaru: selectedSchedule?.tanggalBaru ?? "" };

    try {
      if (user?.role === "operator") {
        if (!selectedSchedule && !createSchedule) {
          showToast("Pilih jadwal atau gunakan + Buat Jadwal agar pengajuan dapat disetujui Admin.", "error");
          return;
        }
        const response = await fetch("/api/change-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(selectedSchedule ? {
            entityType: "jadwal_siaran_update",
            entityId: selectedSchedule.id,
            dataBaru: requestData,
          } : {
            entityType: "jadwal_siaran_create",
            dataBaru: requestData,
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
        body: JSON.stringify(selectedSchedule
          ? { narasumberId: narasumber.id, jadwalId: selectedSchedule.id }
          : { narasumberId: narasumber.id, data, createSchedule }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message ?? "Catatan siaran gagal disimpan.");
      const cooldownEnd = getCooldownEnd(data.tanggal);
      showToast(result.alreadyRecorded
        ? "Siaran ini sudah tercatat sebelumnya."
        : `Siaran ${narasumber.nama} berhasil dicatat${result.scheduleId ? " dan terhubung dengan jadwal" : ""}. ${cooldownEnd ? `Boleh diundang kembali: ${formatDate(cooldownEnd.toISOString())}.` : ""}`, "success");
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

        <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <select
            className={inputClass}
            value={selectedJadwalId}
            disabled={createSchedule}
            onChange={(event) => {
              const nextId = event.target.value;
              setSelectedJadwalId(nextId);
              const schedule = availableSchedules.find((item) => item.id === nextId);
              if (!schedule) return;
              setTanggal(schedule.tanggal);
              setWaktu(schedule.waktu ?? "");
              setProgram(schedule.program);
              setJenisSiaran(schedule.jenisSiaran ?? "live");
              setTopik(schedule.topik ?? "");
              setCatatan(schedule.catatan ?? "");
            }}
            aria-label="Pilih jadwal terkait"
          >
            <option value="">Catat tanpa jadwal</option>
            {availableSchedules.map((schedule) => (
              <option key={schedule.id} value={schedule.id}>
                {formatDate(schedule.tanggal)} · {schedule.waktu || "-"} · {schedule.program}
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-pressed={createSchedule}
            onClick={() => { setCreateSchedule((value) => !value); setSelectedJadwalId(""); }}
            className={createSchedule ? "btn btn-primary" : "btn btn-outline"}
          >
            <PlusCircle size={14} /> {createSchedule ? "Jadwal Baru Dipilih" : "+ Buat Jadwal"}
          </button>
        </div>

        {selectedSchedule && <p className="mb-3 border-l-2 border-[var(--accent)] pl-3 text-[12px] text-[var(--muted-foreground)]">
          Menggunakan data jadwal {selectedSchedule.id}; tanggal, program, dan detail siaran akan diambil dari jadwal tersebut.
        </p>}
        {createSchedule && <p className="mb-3 border-l-2 border-[var(--accent)] pl-3 text-[12px] text-[var(--muted-foreground)]">
          {user?.role === "operator" ? "Jadwal baru dan pencatatan siaran akan diajukan ke Admin." : "Jadwal baru dan catatan siaran dibuat bersama."}
        </p>}
        {availableSchedules.length === 0 && !createSchedule && jadwalList.some((jadwal) =>
          jadwal.narasumberId === narasumber.id && jadwal.status === "dijadwalkan"
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
              <input type="date" className={inputClass} value={tanggal} disabled={!!selectedSchedule} onChange={(e) => setTanggal(e.target.value)} />
            </Field>
            <Field label="Waktu (WITA)">
              <input type="time" className={inputClass} value={waktu} disabled={!!selectedSchedule} onChange={(e) => setWaktu(e.target.value)} />
            </Field>
          </div>
          <Field label="Nama Program / Acara" required>
            <input
              className={inputClass}
              value={program}
              disabled={!!selectedSchedule}
              onChange={(e) => setProgram(e.target.value)}
              placeholder="Dialog Pagi, Siaran Berita, dll."
              autoFocus
            />
          </Field>
          <Field label="Jenis Siaran" required>
            <select className={inputClass} value={jenisSiaran} disabled={!!selectedSchedule} onChange={(e) => setJenisSiaran(e.target.value as JenisSiaran)}>
              <option value="live">Live</option>
              <option value="rekaman">Rekaman</option>
            </select>
          </Field>
          <Field label="Topik Pembahasan">
            <input
              className={inputClass}
              value={topik}
              disabled={!!selectedSchedule}
              onChange={(e) => setTopik(e.target.value)}
              placeholder="Kesehatan Masyarakat Kaltim"
            />
          </Field>
          <Field label="Catatan Tambahan">
            <textarea
              className={textareaClass}
              rows={2}
              value={catatan}
              disabled={!!selectedSchedule}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Catatan opsional..."
            />
          </Field>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
          <button onClick={onClose} className="btn btn-outline w-full sm:w-auto">
            Batal
          </button>
          <button onClick={handleSubmit} disabled={saving} className="btn btn-primary w-full sm:w-auto">
            {saving ? "Menyimpan..." : user?.role === "operator" ? "Ajukan Pencatatan" : createSchedule ? "Buat Jadwal & Catat" : selectedSchedule ? "Catat dari Jadwal" : "Simpan Riwayat Siaran"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
