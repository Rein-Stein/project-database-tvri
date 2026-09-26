"use client";

import { useMemo, useState } from "react";
import { CalendarCheck, Pencil, PlusCircle, Search } from "lucide-react";
import { useNarasumber } from "@/context/NarasumberContext";
import { OperatorGuard } from "@/components/OperatorGuard";
import { NarasumberFormModal } from "@/components/admin/NarasumberFormModal";
import { CatatSiaranModal } from "@/components/admin/CatatSiaranModal";
import type { Narasumber } from "@/types";

export default function OperatorPage() {
  return <OperatorGuard><OperatorContent /></OperatorGuard>;
}

function OperatorContent() {
  const { narasumberList } = useNarasumber();
  const [query, setQuery] = useState("");
  const [editNarasumber, setEditNarasumber] = useState<Narasumber | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [catatTarget, setCatatTarget] = useState<Narasumber | null>(null);
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return narasumberList.filter((n) => !q || [n.nama, n.instansi, n.bidang, n.jabatan ?? ""].some((value) => value.toLowerCase().includes(q)));
  }, [narasumberList, query]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
      <div className="mb-5 border-b border-[var(--border)] pb-4">
        <p className="section-label">Area operator</p>
        <h1 className="mt-2 text-[20px] font-semibold">Data Narasumber</h1>
        <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">Ajukan koreksi data untuk ditinjau Admin.</p>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative max-w-lg flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama, jabatan, instansi..." className="field-input pl-7" />
        </div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary whitespace-nowrap"><PlusCircle size={14} /> Tambah Narasumber</button>
        <a href="/operator/jadwal" className="btn btn-outline whitespace-nowrap">Edit Jadwal</a>
        <a href="/operator/pengajuan" className="btn btn-outline whitespace-nowrap">Riwayat Pengajuan</a>
      </div>
      <div className="surface overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Nama</th><th>Bidang</th><th>Instansi</th><th className="text-right">Aksi</th></tr></thead>
          <tbody>{filtered.map((n) => <tr key={n.id}>
            <td className="font-semibold">{n.nama}<div className="text-[12px] font-normal text-[var(--muted-foreground)]">{n.jabatan || "-"}</div></td>
            <td>{n.bidang}</td><td>{n.instansi}</td>
            <td className="text-right"><div className="flex justify-end gap-1"><button onClick={() => setCatatTarget(n)} className="btn btn-primary !h-7 !px-2 !text-[11px]"><CalendarCheck size={12} /> Catat</button><button onClick={() => setEditNarasumber(n)} className="btn btn-outline !h-7 !px-2 !text-[11px]"><Pencil size={12} /> Edit</button></div></td>
          </tr>)}</tbody>
        </table>
      </div>
      {editNarasumber && <NarasumberFormModal existing={editNarasumber} onClose={() => setEditNarasumber(null)} />}
      {showCreate && <NarasumberFormModal existingNames={narasumberList.map((n) => n.nama)} onClose={() => setShowCreate(false)} />}
      {catatTarget && <CatatSiaranModal narasumber={catatTarget} onClose={() => setCatatTarget(null)} />}
    </div>
  );
}
