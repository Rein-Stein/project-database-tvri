"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSubNav } from "@/components/admin/AdminUI";
import { formatDate, formatDateTime } from "@/types";
import type { ChangeRequest } from "@/types";
import { useToast } from "@/context/ToastContext";

const statusLabel = { pending: "Menunggu Persetujuan", approved: "Disetujui", rejected: "Ditolak" } as const;
const fields: Array<keyof ChangeRequest["dataBaru"]> = ["nama", "bidang", "instansi", "jabatan", "phone"];
const fieldLabel = { nama: "Nama", bidang: "Bidang", instansi: "Instansi", jabatan: "Jabatan", phone: "Telepon" };

export default function ApprovalPage() { return <AdminGuard><ApprovalContent /></AdminGuard>; }

function ApprovalContent() {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reasonId, setReasonId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const { showToast } = useToast();
  const load = useCallback(() => { setLoading(true); fetch("/api/change-requests", { cache: "no-store" }).then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.message); setRequests(data.requests); }).catch((err) => showToast(err.message || "Gagal memuat pengajuan.", "error")).finally(() => setLoading(false)); }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const decide = async (request: ChangeRequest, action: "approve" | "reject") => {
    if (action === "reject" && !reason.trim()) { showToast("Alasan penolakan wajib diisi.", "error"); return; }
    const res = await fetch(`/api/change-requests/${request.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { showToast(data.message ?? "Pengajuan gagal diproses.", "error"); return; }
    showToast(data.message, "success"); setReasonId(null); setReason(""); load();
  };

  return <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8"><div className="mb-5 border-b border-[var(--border)] pb-4"><p className="section-label">Area administrasi</p><h1 className="mt-2 text-[20px] font-semibold">Persetujuan Perubahan</h1><p className="mt-1 text-[13px] text-[var(--muted-foreground)]">Tinjau perubahan data yang diajukan Operator.</p></div><AdminSubNav />
    {loading ? <div className="surface p-6 text-[13px] text-[var(--muted-foreground)]">Memuat pengajuan...</div> : requests.length === 0 ? <div className="surface p-8 text-center text-[13px] text-[var(--muted-foreground)]">Belum ada pengajuan perubahan.</div> : <div className="space-y-4">{requests.map((request) => <article key={request.id} className="surface p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{request.dataLama.nama}</h2><p className="text-[12px] text-[var(--muted-foreground)]">Operator: {request.operatorName} · {formatDateTime(request.createdAt)}</p></div><span className="border border-[var(--border-strong)] px-2 py-1 text-[11px] font-semibold">{statusLabel[request.status]}</span></div><div className="mt-4 overflow-x-auto"><table className="data-table"><thead><tr><th>Field</th><th>Data Lama</th><th>Data Baru</th></tr></thead><tbody>{fields.map((field) => <tr key={field} className={request.dataLama[field] !== request.dataBaru[field] ? "bg-[var(--accent-muted)]" : ""}><td className="font-semibold">{fieldLabel[field]}</td><td>{request.dataLama[field] || "-"}</td><td>{request.dataBaru[field] || "-"}</td></tr>)}</tbody></table></div>{request.status === "rejected" && request.alasanPenolakan && <p className="mt-3 text-[12px] text-[var(--danger)]">Alasan penolakan: {request.alasanPenolakan}</p>}{request.status === "pending" && request.operatorId !== "" && <div className="mt-4 flex flex-col gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end"><button onClick={() => decide(request, "approve")} className="btn btn-primary">Setujui</button>{reasonId === request.id ? <><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Alasan penolakan" className="field-input sm:max-w-xs" /><button onClick={() => decide(request, "reject")} className="btn btn-danger">Tolak</button></> : <button onClick={() => setReasonId(request.id)} className="btn btn-outline">Tolak</button>}</div>}</article>)}</div>}
  </div>;
}
