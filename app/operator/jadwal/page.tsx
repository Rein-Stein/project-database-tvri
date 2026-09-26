"use client";

import { useMemo, useState } from "react";
import { Pencil, Search } from "lucide-react";
import { OperatorGuard } from "@/components/OperatorGuard";
import { JadwalFormModal } from "@/components/admin/JadwalFormModal";
import { useNarasumber } from "@/context/NarasumberContext";
import { formatDate, JADWAL_LABEL, type JadwalSiaran } from "@/types";

export default function OperatorJadwalPage() {
  return <OperatorGuard><OperatorJadwalContent /></OperatorGuard>;
}

function OperatorJadwalContent() {
  const { narasumberList, jadwalList } = useNarasumber();
  const [query, setQuery] = useState("");
  const [editJadwal, setEditJadwal] = useState<JadwalSiaran | null>(null);
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return jadwalList.filter((jadwal) => {
      const narasumber = narasumberList.find((item) => item.id === jadwal.narasumberId);
      return !normalizedQuery || [narasumber?.nama ?? "", jadwal.program, jadwal.topik ?? ""]
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    }).sort((left, right) => left.tanggal.localeCompare(right.tanggal));
  }, [jadwalList, narasumberList, query]);

  return <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
    <div className="mb-5 border-b border-[var(--border)] pb-4">
      <p className="section-label">Area operator</p>
      <h1 className="mt-2 text-[20px] font-semibold">Jadwal Siaran</h1>
      <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">Perubahan jadwal dikirim ke Admin untuk ditinjau.</p>
    </div>
    <div className="mb-4 flex flex-wrap gap-2">
      <div className="relative max-w-lg flex-1">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari narasumber, program, topik..." className="field-input pl-7" />
      </div>
      <a href="/operator" className="btn btn-outline">Data Narasumber</a>
      <a href="/operator/pengajuan" className="btn btn-outline">Riwayat Pengajuan</a>
    </div>
    {filtered.length === 0 ? <div className="surface p-8 text-center text-[13px] text-[var(--muted-foreground)]">Belum ada jadwal yang cocok.</div> : <div className="surface overflow-x-auto">
      <table className="data-table">
        <thead><tr><th>Tanggal</th><th>Narasumber</th><th>Program / Topik</th><th>Status</th><th className="text-right">Aksi</th></tr></thead>
        <tbody>{filtered.map((jadwal) => {
          const narasumber = narasumberList.find((item) => item.id === jadwal.narasumberId);
          return <tr key={jadwal.id}>
            <td className="whitespace-nowrap">{formatDate(jadwal.tanggal)}{jadwal.waktu ? <div className="text-[12px] text-[var(--muted-foreground)]">{jadwal.waktu} WITA</div> : null}</td>
            <td className="font-semibold">{narasumber?.nama ?? "-"}</td>
            <td>{jadwal.program}{jadwal.topik ? <div className="text-[12px] text-[var(--muted-foreground)]">{jadwal.topik}</div> : null}</td>
            <td>{JADWAL_LABEL[jadwal.status]}{narasumber?.riwayat.some((history) => history.id === `jadwal-${jadwal.id}` || history.jadwalId === jadwal.id) && <div className="mt-1 text-[11px] font-medium text-[var(--success)]">Siaran sudah dicatat</div>}</td>
            <td className="text-right"><button onClick={() => setEditJadwal(jadwal)} className="btn btn-outline !h-7 !px-2 !text-[11px]"><Pencil size={12} /> Edit</button></td>
          </tr>;
        })}</tbody>
      </table>
    </div>}
    {editJadwal && <JadwalFormModal existing={editJadwal} onClose={() => setEditJadwal(null)} />}
  </div>;
}