"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNarasumber } from "@/context/NarasumberContext";
import { useToast } from "@/context/ToastContext";
import { Field, inputClass, textareaClass } from "@/components/admin/AdminUI";
import {
  formatDate,
  getCooldownEnd,
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
  const { catatSiaran, addLog } = useNarasumber();
  const { showToast } = useToast();

  const today = new Date().toISOString().slice(0, 10);
  const [tanggal, setTanggal] = useState(today);
  const [waktu, setWaktu] = useState("");
  const [program, setProgram] = useState("");
  const [jenisSiaran, setJenisSiaran] = useState<JenisSiaran>("live");
  const [topik, setTopik] = useState("");
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const last = getLastAppearance(narasumber);
  const status = getNarasumberStatus(last);

  const handleSubmit = () => {
    if (!tanggal || !program.trim()) {
      showToast("Tanggal dan Program wajib diisi.", "error");
      return;
    }
    setSaving(true);
    catatSiaran(narasumber.id, {
      tanggal,
      waktu: waktu || undefined,
      program: program.trim(),
      jenisSiaran,
      topik: topik.trim() || undefined,
      catatan: catatan.trim() || undefined,
    });

    const cooldownEnd = getCooldownEnd(tanggal);
    addLog(
      `Catat siaran: ${narasumber.nama}`,
      `Tanggal: ${formatDate(tanggal)}, Program: ${program.trim()}`
    );
    showToast(
      `Siaran berhasil dicatat.\n${narasumber.nama} · Boleh diundang kembali: ${
        cooldownEnd ? formatDate(cooldownEnd.toISOString()) : "—"
      }`,
      "success"
    );
    setSaving(false);
    onClose();
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

        {status === "dalam-jeda" && (
          <div className="mb-3 border border-[var(--warning)] bg-[#fdf6e3] p-2 text-[12px] text-[var(--warning)]">
            Narasumber ini sedang dalam masa tunggu. Terakhir tampil: <b>{formatDate(last)}</b>
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Tanggal Siaran" required>
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
              autoFocus
            />
          </Field>
          <Field label="Jenis Siaran" required>
            <select className={inputClass} value={jenisSiaran} onChange={(e) => setJenisSiaran(e.target.value as JenisSiaran)}>
              <option value="live">Live</option>
              <option value="rekaman">Rekaman</option>
            </select>
          </Field>
          <Field label="Topik Pembahasan">
            <input
              className={inputClass}
              value={topik}
              onChange={(e) => setTopik(e.target.value)}
              placeholder="Kesehatan Masyarakat Kaltim"
            />
          </Field>
          <Field label="Catatan Tambahan">
            <textarea
              className={textareaClass}
              rows={2}
              value={catatan}
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
            {saving ? "Menyimpan..." : "Simpan Riwayat Siaran"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
