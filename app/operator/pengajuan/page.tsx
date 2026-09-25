"use client";

import { useEffect, useState } from "react";
import { OperatorGuard } from "@/components/OperatorGuard";
import { formatDate } from "@/types";
import type { ChangeRequest } from "@/types";

const statusLabel = { pending: "Menunggu Persetujuan", approved: "Disetujui", rejected: "Ditolak" } as const;

export default function OperatorRequestsPage() {
  return <OperatorGuard><RequestsContent /></OperatorGuard>;
}

function RequestsContent() {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/change-requests", { cache: "no-store" }).then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.message); setRequests(data.requests); }).catch((err) => setError(err.message || "Gagal memuat pengajuan.")); }, []);
  return <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
    <div className="mb-5 flex items-center justify-between border-b border-[var(--border)] pb-4"><div><p className="section-label">Area operator</p><h1 className="mt-2 text-[20px] font-semibold">Riwayat Pengajuan</h1></div><a href="/operator" className="btn btn-outline">Data Narasumber</a></div>
    {error && <div className="mb-4 border border-[var(--danger)] bg-[var(--danger-muted)] px-3 py-2 text-[12px] text-[var(--danger)]">{error}</div>}
    {requests.length === 0 ? <div className="surface p-8 text-center text-[13px] text-[var(--muted-foreground)]">Belum ada pengajuan perubahan.</div> : <div className="space-y-3">{requests.map((request) => <article key={request.id} className="surface p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Narasumber: {request.dataBaru.nama}</h2><p className="text-[12px] text-[var(--muted-foreground)]">Diajukan {formatDate(request.createdAt)}</p></div><span className="border border-[var(--border-strong)] px-2 py-1 text-[11px] font-semibold">{statusLabel[request.status]}</span></div>{request.status === "rejected" && request.alasanPenolakan && <p className="mt-3 border-l-2 border-[var(--danger)] pl-3 text-[12px] text-[var(--danger)]">Alasan: {request.alasanPenolakan}</p>}</article>)}</div>}
  </div>;
}
