"use client";

import { useEffect, useState } from "react";
import { Pencil, PlusCircle, RotateCcw, Save, X } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSubNav, Field, inputClass } from "@/components/admin/AdminUI";
import { useNarasumber } from "@/context/NarasumberContext";
import type { ProgramSiaran } from "@/types";

interface ProgramUsage extends ProgramSiaran {
  jumlahPemakaian: number;
}

function ProgramContent() {
  const { programList, addProgram, renameProgram, setProgramAktif } = useNarasumber();
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/programs", { cache: "no-store" })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok) {
          const errorMessage = payload && typeof payload === "object" && "message" in payload
            ? String(payload.message)
            : "Daftar program gagal dimuat.";
          throw new Error(errorMessage);
        }
        const programs = payload && typeof payload === "object" && "programs" in payload
          ? payload.programs
          : null;
        if (!Array.isArray(programs)) throw new Error("Respons daftar program tidak valid.");
        return programs as ProgramUsage[];
      })
      .then((programs) => {
        if (!cancelled) setUsage(Object.fromEntries(programs.map((program) => [program.id, program.jumlahPemakaian])));
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Daftar program gagal dimuat.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAdd = async () => {
    setError("");
    setMessage("");
    setSavingId("new");
    try {
      const program = await addProgram(newName);
      setUsage((current) => ({ ...current, [program.id]: 0 }));
      setNewName("");
      setMessage("Program berhasil ditambahkan.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Program gagal ditambahkan.");
    } finally {
      setSavingId(null);
    }
  };

  const handleRename = async (id: string) => {
    setError("");
    setMessage("");
    setSavingId(id);
    try {
      await renameProgram(id, editingName);
      setEditingId(null);
      setMessage("Nama program berhasil diperbarui.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nama program gagal diperbarui.");
    } finally {
      setSavingId(null);
    }
  };

  const handleToggle = async (program: ProgramSiaran) => {
    setError("");
    setMessage("");
    setSavingId(program.id);
    try {
      await setProgramAktif(program.id, !program.aktif);
      setMessage(`Program berhasil ${program.aktif ? "dinonaktifkan" : "diaktifkan"}.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Status program gagal diperbarui.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 sm:px-8">
      <div className="mb-5 border-b border-[var(--border)] pb-4">
        <p className="section-label">Pengelolaan sistem</p>
        <h1 className="mt-2 text-[20px] font-semibold">Kelola Program</h1>
        <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
          Tambahkan program, ubah nama, atau nonaktifkan program yang tidak lagi digunakan.
        </p>
      </div>
      <AdminSubNav />

      <form
        className="surface mb-5 flex flex-col gap-3 p-5 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          void handleAdd();
        }}
      >
        <div className="flex-1">
          <Field label="Nama program baru" required>
            <input
              className={inputClass}
              maxLength={180}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Contoh: Dialog Pagi"
            />
          </Field>
        </div>
        <button type="submit" className="btn btn-primary" disabled={savingId === "new" || !newName.trim()}>
          <PlusCircle size={14} /> {savingId === "new" ? "Menyimpan..." : "Tambah Program"}
        </button>
      </form>

      {message && <p className="mb-3 border border-[var(--success)] bg-[var(--success-muted)] px-3 py-2 text-[12px] text-[var(--success)]">{message}</p>}
      {error && <p className="mb-3 border border-[var(--danger)] bg-[var(--danger-muted)] px-3 py-2 text-[12px] text-[var(--danger)]">{error}</p>}

      {loading ? (
        <div className="surface p-5 text-[13px] text-[var(--muted-foreground)]">Memuat daftar program...</div>
      ) : programList.length === 0 ? (
        <div className="surface p-8 text-center text-[13px] text-[var(--muted-foreground)]">Belum ada program terdaftar.</div>
      ) : (
        <div className="surface overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>Nama Program</th><th>Status</th><th>Jumlah Pemakaian</th><th className="text-right">Aksi</th></tr>
            </thead>
            <tbody>
              {programList.map((program) => (
                <tr key={program.id}>
                  <td>
                    {editingId === program.id ? (
                      <input
                        className={inputClass}
                        maxLength={180}
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        aria-label="Nama program baru"
                      />
                    ) : <span className="font-semibold">{program.nama}</span>}
                  </td>
                  <td>{program.aktif ? "Aktif" : "Nonaktif"}</td>
                  <td>{usage[program.id] ?? 0}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      {editingId === program.id ? (
                        <>
                          <button
                            className="btn btn-primary !h-7 !px-2 !text-[11px]"
                            disabled={savingId === program.id || !editingName.trim()}
                            onClick={() => void handleRename(program.id)}
                          >
                            <Save size={12} /> Simpan
                          </button>
                          <button className="btn btn-outline !h-7 !px-2 !text-[11px]" onClick={() => setEditingId(null)}>
                            <X size={12} /> Batal
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn btn-outline !h-7 !px-2 !text-[11px]"
                            onClick={() => {
                              setEditingId(program.id);
                              setEditingName(program.nama);
                            }}
                          >
                            <Pencil size={12} /> Ubah Nama
                          </button>
                          <button
                            className="btn btn-outline !h-7 !px-2 !text-[11px]"
                            disabled={savingId === program.id}
                            onClick={() => void handleToggle(program)}
                          >
                            <RotateCcw size={12} /> {program.aktif ? "Nonaktifkan" : "Aktifkan"}
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
    </div>
  );
}

export default function AdminProgramPage() {
  return (
    <AdminGuard>
      <ProgramContent />
    </AdminGuard>
  );
}
