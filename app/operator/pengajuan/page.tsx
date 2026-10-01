"use client";

import { useEffect, useState } from "react";
import { OperatorGuard } from "@/components/OperatorGuard";
import { useNarasumber } from "@/context/NarasumberContext";
import { formatDate, formatDateTime, JADWAL_LABEL, type ChangeRequest, type JadwalStatus } from "@/types";

const statusLabel = { pending: "Menunggu Persetujuan", approved: "Disetujui", rejected: "Ditolak" } as const;

function requestTypeLabel(entityType: ChangeRequest["entityType"]): string {
  if (entityType === "narasumber_create") return "Tambah Narasumber";
  if (entityType === "jadwal_siaran_create") return "Tambah Jadwal";
  if (entityType === "jadwal_siaran_update") return "Edit Jadwal";
  return "Edit Narasumber";
}

export default function OperatorRequestsPage() {
  return <OperatorGuard><RequestsContent /></OperatorGuard>;
}

function RequestsContent() {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [error, setError] = useState("");
  const { narasumberList } = useNarasumber();
  useEffect(() => { fetch("/api/change-requests", { cache: "no-store" }).then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.message); setRequests(data.requests); }).catch((err) => setError(err.message || "Gagal memuat pengajuan.")); }, []);

  const displayValue = (field: string, value: string | undefined) => {
    if (!value) return "-";
    if (field === "narasumberId") return narasumberList.find((item) => item.id === value)?.nama ?? value;
    if (field === "tanggal" || field === "tanggalBaru") return formatDate(value);
    if (field === "status") return JADWAL_LABEL[value as JadwalStatus] ?? value;
    return value;
  };

  return <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4"><div><p className="section-label">Area operator</p><h1 className="mt-2 text-[20px] font-semibold">Riwayat Pengajuan</h1></div><div className="flex gap-2"><a href="/operator" className="btn btn-outline">Data Narasumber</a><a href="/operator/jadwal" className="btn btn-outline">Jadwal</a></div></div>
    {error && <div className="mb-4 border border-[var(--danger)] bg-[var(--danger-muted)] px-3 py-2 text-[12px] text-[var(--danger)]">{error}</div>}
    {requests.length === 0 ? <div className="surface p-8 text-center text-[13px] text-[var(--muted-foreground)]">Belum ada pengajuan perubahan.</div> : <div className="space-y-3">{requests.map((request) => {
      const jadwalRequest = request.entityType === "jadwal_siaran_update" || request.entityType === "jadwal_siaran_create";
      const oldData = request.dataLama as Record<string, string | undefined>;
      const newData = request.dataBaru as Record<string, string | undefined>;
      const fields = jadwalRequest
        ? [["narasumberId", "Narasumber"], ["tanggal", "Tanggal"], ["waktu", "Waktu"], ["program", "Program"], ["jenisSiaran", "Jenis Siaran"], ["topik", "Topik"], ["catatan", "Catatan"], ["status", "Status"]]
        : [["nama", "Nama"], ["bidang", "Bidang"], ["instansi", "Instansi"], ["jabatan", "Jabatan"], ["phone", "Telepon"]];
      const title = jadwalRequest ? newData.program || "Jadwal Siaran" : newData.nama || oldData.nama || "Narasumber";
      return <article key={request.id} className="surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-[11px] font-semibold uppercase text-[var(--accent)]">{requestTypeLabel(request.entityType)}</p><h2 className="mt-1 font-semibold">{title}</h2>
            <p className="text-[12px] text-[var(--muted-foreground)]">Diajukan {formatDateTime(request.createdAt)}</p>
            {request.reviewedAt && <p className="text-[12px] text-[var(--muted-foreground)]">Direview {formatDateTime(request.reviewedAt)}</p>}
          </div>
          <span className="border border-[var(--border-strong)] px-2 py-1 text-[11px] font-semibold">{statusLabel[request.status]}</span>
        </div>
        <div className="mt-3 overflow-x-auto"><table className="data-table"><thead><tr><th>Field</th><th>Data Lama</th><th>Data Baru</th></tr></thead><tbody>
          {fields.map(([field, label]) => <tr key={field}><td className="font-semibold">{label}</td><td>{displayValue(field, oldData[field])}</td><td>{displayValue(field, newData[field])}</td></tr>)}
        </tbody></table></div>
        {request.status === "rejected" && request.alasanPenolakan && <p className="mt-3 border-l-2 border-[var(--danger)] pl-3 text-[12px] text-[var(--danger)]">Alasan penolakan: {request.alasanPenolakan}</p>}
      </article>;
    })}</div>}
  </div>;
}
