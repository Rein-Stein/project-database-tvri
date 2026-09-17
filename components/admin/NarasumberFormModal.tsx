"use client";

import { useState } from "react";
import { useNarasumber } from "@/context/NarasumberContext";
import { useToast } from "@/context/ToastContext";
import { Field, inputClass } from "@/components/admin/AdminUI";
import type { Narasumber } from "@/types";

interface Props {
  existing?: Narasumber | null;
  existingNames?: string[];
  onClose: () => void;
}

export function NarasumberFormModal({ existing, existingNames = [], onClose }: Props) {
  const { addNarasumber, updateNarasumber, addLog } = useNarasumber();
  const { showToast } = useToast();

  const [nama, setNama] = useState(existing?.nama ?? "");
  const [instansi, setInstansi] = useState(existing?.instansi ?? "");
  const [jabatan, setJabatan] = useState(existing?.jabatan ?? "");
  const [bidang, setBidang] = useState(existing?.bidang ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [dupWarn, setDupWarn] = useState(false);
  const [saving, setSaving] = useState(false);

  const isDuplicate =
    !existing &&
    existingNames.some((n) => n.toLowerCase().trim() === nama.toLowerCase().trim() && nama.trim() !== "");

  const handleSubmit = (force = false) => {
    if (!nama.trim() || !instansi.trim() || !bidang.trim()) {
      showToast("Nama, Instansi, dan Bidang wajib diisi.", "error");
      return;
    }
    if (isDuplicate && !force) {
      setDupWarn(true);
      return;
    }
    setSaving(true);
    if (existing) {
      updateNarasumber(existing.id, {
        nama: nama.trim(),
        instansi: instansi.trim(),
        jabatan: jabatan.trim(),
        bidang: bidang.trim(),
        phone: phone.trim(),
      });
      addLog(`Edit narasumber: ${nama.trim()}`);
      showToast(`Data ${nama.trim()} berhasil diperbarui.`, "success");
    } else {
      addNarasumber({
        nama: nama.trim(),
        instansi: instansi.trim(),
        jabatan: jabatan.trim(),
        bidang: bidang.trim(),
        phone: phone.trim(),
      });
      addLog(`Tambah narasumber: ${nama.trim()}`);
      showToast(`Narasumber ${nama.trim()} berhasil ditambahkan.`, "success");
    }
    setSaving(false);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="surface flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden shadow-md"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 pb-3 pt-5">
          <h2 className="text-[14px] font-semibold">
            {existing ? "Edit Narasumber" : "Tambah Narasumber"}
          </h2>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {dupWarn && (
            <div className="mb-3 border border-[var(--warning)] bg-[#fdf6e3] p-3 text-[12px] text-[var(--warning)]">
              <p className="font-semibold">Narasumber dengan nama ini mungkin sudah terdaftar.</p>
              <p className="mt-1">Yakin ingin menambahkan sebagai narasumber baru?</p>
              <div className="mt-2 flex gap-2">
                <button onClick={() => handleSubmit(true)} className="btn btn-primary !h-7 !px-2 !text-[11px]">
                  Tetap Tambahkan
                </button>
                <button onClick={() => setDupWarn(false)} className="btn btn-outline !h-7 !px-2 !text-[11px]">
                  Batalkan
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Field label="Nama Lengkap" required>
              <input
                className={inputClass}
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Dr. H. Ahmad Subarno"
                autoFocus
              />
            </Field>
            <Field label="Instansi / Lembaga" required>
              <input
                className={inputClass}
                value={instansi}
                onChange={(e) => setInstansi(e.target.value)}
                placeholder="Dinas Kesehatan Kaltim"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Jabatan">
                <input
                  className={inputClass}
                  value={jabatan}
                  onChange={(e) => setJabatan(e.target.value)}
                  placeholder="Kepala Dinas"
                />
              </Field>
              <Field label="Bidang / Keahlian" required>
                <input
                  className={inputClass}
                  value={bidang}
                  onChange={(e) => setBidang(e.target.value)}
                  placeholder="Kesehatan Masyarakat"
                />
              </Field>
            </div>
            <Field label="No. Telepon / Kontak">
              <input
                className={inputClass}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812-xxxx-xxxx"
              />
            </Field>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
          <button onClick={onClose} className="btn btn-outline">
            Batal
          </button>
          <button onClick={() => handleSubmit(false)} disabled={saving} className="btn btn-primary">
            {saving ? "Menyimpan..." : existing ? "Simpan Perubahan" : "Tambah Narasumber"}
          </button>
        </div>
      </div>
    </div>
  );
}
  
